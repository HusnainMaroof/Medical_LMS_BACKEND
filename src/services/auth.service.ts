import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { hashValueHelper } from "../utils/helper.js";

import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from "../utils/app.error.js";
import {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SessionPayload,
} from "../type/Auth.types.js";
import {
  clearLoginFailures,
  consumeResetToken,
  getLoginFailures,
  getResetRequestCount,
  incrementLoginFailures,
  incrementResetRequestCount,
  setResetToken,
} from "../lib/auth.redis.js";
import { sendPasswordResetEmail } from "../utils/email.util.js";

const MAX_LOGIN_FAILURES = 5;
const MAX_RESET_REQUESTS = 3;

// ======================================================
// LOGIN
// ======================================================

export const loginService = async (
  input: LoginInput,
): Promise<SessionPayload> => {
  const { email, password, role } = input;

  // Rate limit check
  const failures = await getLoginFailures(email);
  if (failures >= MAX_LOGIN_FAILURES) {
    throw new ForbiddenException(
      "Account temporarily locked. Too many failed attempts. Try again in 15 minutes.",
    );
  }

  let user: {
    id: string;
    email: string;
    password: string;
    fullName: string;
    status: string;
    studentCode?: string | null;
    batchId?: string | null;
    paymentStatus?: string | null;
  } | null = null;

  if (role === "professor") {
    user = await prisma.professor.findUnique({ where: { email } });
  } else {
    // Single query — fetch student + their most recent paid enrollment
    const student = await prisma.student.findUnique({
      where: { email },
      include: {
        enrollments: {
          where: { paymentStatus: "paid" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { batchId: true, paymentStatus: true },
        },
      },
    });

    if (student) {
      const paidEnrollment = student.enrollments[0];
      user = {
        id: student.id,
        email: student.email,
        password: student.password,
        fullName: student.fullName,
        status: student.status,
        studentCode: student.studentCode,
        batchId: paidEnrollment?.batchId ?? null,
        paymentStatus: paidEnrollment?.paymentStatus ?? null,
      };
    }
  }

  // Generic message — never reveal whether email exists
  if (!user) {
    await incrementLoginFailures(email);
    throw new UnauthorizedException("Invalid email or password.");
  }

  // Status check before bcrypt — skip hash cost if suspended
  if (user.status !== "active") {
    throw new ForbiddenException(
      "Your account has been suspended. Contact the professor.",
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    await incrementLoginFailures(email);
    throw new UnauthorizedException("Invalid email or password.");
  }

  await clearLoginFailures(email);

  if (role === "professor") {
    return {
      userId: user.id,
      email: user.email,
      role: "professor",
      fullName: user.fullName,
    };
  }

  return {
    userId: user.id,
    email: user.email,
    role: "student",
    fullName: user.fullName,
    studentCode: user.studentCode!,
    batchId: user.batchId ?? undefined,
    paymentStatus: (user.paymentStatus as "paid" | "unpaid") ?? undefined,
  };
};

// ======================================================
// FORGOT PASSWORD
// Centralized — professor and student use the same endpoint.
// Role sent in body → used only to look up the correct table.
// Always returns 200 silently — prevents email enumeration.
// ======================================================

export const forgotPasswordService = async (
  input: ForgotPasswordInput,
): Promise<void> => {
  const { email, role } = input;

  const requestCount = await getResetRequestCount(email);
  if (requestCount >= MAX_RESET_REQUESTS) {
    throw new BadRequestException(
      "Too many password reset requests. Try again after 1 hour.",
    );
  }

  // Increment before lookup — rate limit applies even if user doesn't exist
  await incrementResetRequestCount(email);

  const user =
    role === "professor"
      ? await prisma.professor.findUnique({ where: { email } })
      : await prisma.student.findUnique({ where: { email } });

  if (!user) return; // silent — don't leak whether email exists

  const token = crypto.randomBytes(32).toString("hex");

  // Role is embedded in Redis — client never sends role on /reset-password
  await setResetToken(token, { userId: user.id, email: user.email, role });
  await sendPasswordResetEmail(user.email, user.fullName, token);
};

// ======================================================
// RESET PASSWORD
// Token consumed immediately — one-time use.
// Role comes from Redis payload, never from client.
// ======================================================

export const resetPasswordService = async (
  input: ResetPasswordInput,
): Promise<void> => {
  const { token, newPassword } = input;

  const payload = await consumeResetToken(token);
  if (!payload) {
    throw new BadRequestException(
      "Reset link is invalid or has already been used. Request a new one.",
    );
  }

  const { userId, role } = payload;
  const hashedPassword = await hashValueHelper(newPassword);

  if (role === "professor") {
    await prisma.professor.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  } else {
    await prisma.student.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
};

// ======================================================
// GET ME
// Called on dashboard load — returns role-specific profile.
// Professor: profile only.
// Student: profile + active paid batch.
// ======================================================

export const getMeService = async (
  userId: string,
  role: "professor" | "student",
) => {
  if (role === "professor") {
    const professor = await prisma.professor.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    if (!professor) throw new NotFoundException("Professor not found.");
    return { role: "professor", ...professor };
  }

  const student = await prisma.student.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      studentCode: true,
      status: true,
      createdAt: true,
      enrollments: {
        where: { paymentStatus: "paid" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          paymentStatus: true,
          batch: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!student) throw new NotFoundException("Student not found.");

  const paidEnrollment = student.enrollments[0] ?? null;

  return {
    role: "student",
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    studentCode: student.studentCode,
    status: student.status,
    createdAt: student.createdAt,
    activeBatch: paidEnrollment?.batch ?? null,
    paymentStatus: paidEnrollment?.paymentStatus ?? null,
  };
};
