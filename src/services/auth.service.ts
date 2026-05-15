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
  LoginResult,
  ResetPasswordInput,
  SessionPayload,
} from "../type/Auth.types.js";
import {
  clearLoginFailures,
  consumeResetToken,
  deleteRefreshToken,
  getCachedUserProfile,
  getLoginFailures,
  getStoredRefreshToken,
  getResetRequestCount,
  incrementLoginFailures,
  incrementResetRequestCount,
  invalidateUserProfile,
  saveRefreshToken,
  setCachedUserProfile,
  setResetToken,
} from "../lib/auth.redis.js";
import { sendPasswordResetEmail } from "../utils/email.util.js";
import {
  AccessTokenPayload,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.utli.js";

const MAX_LOGIN_FAILURES = 5;
const MAX_RESET_REQUESTS = 3;

// ─────────────────────────────────────────────────────────────
// INTERNAL: issue token pair + persist refresh token
// deviceId is null for professors, string for students
// ─────────────────────────────────────────────────────────────

const issueTokenPair = async (
  payload: SessionPayload,
  deviceId: string | null,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessPayload: AccessTokenPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    fullName: payload.fullName,
    studentCode: payload.studentCode,
    batchId: payload.batchId,
    paymentStatus: payload.paymentStatus,
  };

  const accessToken = signAccessToken(accessPayload);
  const refreshToken = signRefreshToken({
    userId: payload.userId,
    role: payload.role,
  });

  // Store token + deviceId together in Redis
  await saveRefreshToken(payload.userId, refreshToken, deviceId);

  return { accessToken, refreshToken };
};

// ─────────────────────────────────────────────────────────────
// LOGIN
//
// DEVICE REGISTRATION FLOW (students only):
//
// Case 1 — No device registered yet (first login):
//   → Save deviceId to DB (Student.deviceId)
//   → Save { token, deviceId } to Redis
//   → Allow login
//
// Case 2 — Device already registered, same device:
//   → incoming deviceId === DB deviceId
//   → Allow login (normal re-login)
//
// Case 3 — Device already registered, different device:
//   → incoming deviceId !== DB deviceId
//   → Reject with clear message
//   → Student must contact professor to reset device
//
// Professor login — no device check at all.
// ─────────────────────────────────────────────────────────────

export const loginService = async (
  input: LoginInput,
  deviceId: string | null, // extracted from X-Device-ID header in controller
): Promise<LoginResult> => {
  const { email, password, role } = input;

  // Rate limit check (Redis only — no DB)
  const failures = await getLoginFailures(email);
  if (failures >= MAX_LOGIN_FAILURES) {
    throw new ForbiddenException(
      "Account temporarily locked. Too many failed attempts. Try again in 15 minutes.",
    );
  }

  // ── Fetch user ──────────────────────────────────────────────

  let user: {
    id: string;
    email: string;
    password: string;
    fullName: string;
    status: string;
    studentCode?: string | null;
    batchId?: string | null;
    paymentStatus?: string | null;
    deviceId?: string | null; // only populated for students
  } | null = null;

  if (role === "professor") {
    user = await prisma.professor.findUnique({ where: { email } });
  } else {
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
      const paid = student.enrollments[0];
      user = {
        id: student.id,
        email: student.email,
        password: student.password,
        fullName: student.fullName,
        status: student.status,
        studentCode: student.studentCode,
        deviceId: student.deviceId, // ← from schema
        batchId: paid?.batchId ?? null,
        paymentStatus: paid?.paymentStatus ?? null,
      };
    }
  }

  if (!user) {
    await incrementLoginFailures(email);
    throw new UnauthorizedException("Invalid email or password.");
  }

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

  // ── Device check (students only) ───────────────────────────

  if (role === "student") {
    if (!deviceId) {
      // Mobile app must always send X-Device-ID
      throw new BadRequestException(
        "Device ID is required. Please use the official app.",
      );
    }

    if (!user.deviceId) {
      // Case 1 — First login: register this device in DB
      await prisma.student.update({
        where: { id: user.id },
        data: {
          deviceId: deviceId,
          deviceRegisteredAt: new Date(),
        },
      });
    } else if (user.deviceId !== deviceId) {
      // Case 3 — Different device: reject
      throw new ForbiddenException(
        "This account is registered on another device. Contact your professor to reset device access.",
      );
    }
    // Case 2 — Same device: fall through, no DB write needed
  }

  // ── Build session payload ───────────────────────────────────

  const sessionPayload: SessionPayload =
    role === "professor"
      ? {
          userId: user.id,
          email: user.email,
          role: "professor",
          fullName: user.fullName,
        }
      : {
          userId: user.id,
          email: user.email,
          role: "student",
          fullName: user.fullName,
          studentCode: user.studentCode!,
          batchId: user.batchId ?? undefined,
          paymentStatus: (user.paymentStatus as "paid" | "unpaid") ?? undefined,
        };

  // Professor → deviceId null (no device tracking)
  // Student   → deviceId string (validated above)
  const tokens = await issueTokenPair(
    sessionPayload,
    role === "student" ? deviceId : null,
  );

  return { tokens, user: sessionPayload };
};

// ─────────────────────────────────────────────────────────────
// REFRESH
//
// DEVICE CHECK on refresh:
// The deviceId stored in Redis is compared against the
// X-Device-ID header on every rotation. This means even if
// someone steals the refresh token cookie, they cannot use
// it from a different device.
//
// Professor refresh → deviceId is null in Redis → skip check.
//
// CACHE-ASIDE on payload rebuild:
// Tries Redis profile cache first → DB only on miss.
// ─────────────────────────────────────────────────────────────

export const refreshTokenService = async (
  incomingToken: string,
  deviceId: string | null,
): Promise<{ accessToken: string; refreshToken: string }> => {
  // 1. Verify JWT signature + expiry
  let decoded: ReturnType<typeof verifyRefreshToken>;
  try {
    decoded = verifyRefreshToken(incomingToken);
  } catch {
    throw new UnauthorizedException("Invalid or expired refresh token.");
  }

  // 2. Whitelist check
  const stored = await getStoredRefreshToken(decoded.userId);
  if (!stored || stored.token !== incomingToken) {
    await deleteRefreshToken(decoded.userId);
    throw new UnauthorizedException(
      "Refresh token reuse detected. Please log in again.",
    );
  }

  // 3. Device check (students only)
  if (decoded.role === "student") {
    if (!deviceId) {
      throw new BadRequestException(
        "Device ID is required. Please use the official app.",
      );
    }

    if (stored.deviceId && stored.deviceId !== deviceId) {
      // Different device trying to refresh — wipe + reject
      await deleteRefreshToken(decoded.userId);
      throw new ForbiddenException(
        "Device mismatch. This session belongs to a different device.",
      );
    }
  }

  // 4. Cache-aside: try Redis first, DB on miss
  let freshPayload = await getCachedUserProfile<SessionPayload>(decoded.userId);

  if (!freshPayload) {
    if (decoded.role === "professor") {
      const professor = await prisma.professor.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, fullName: true, status: true },
      });

      if (!professor || professor.status !== "active") {
        await deleteRefreshToken(decoded.userId);
        throw new UnauthorizedException("Account not found or suspended.");
      }

      freshPayload = {
        userId: professor.id,
        email: professor.email,
        role: "professor",
        fullName: professor.fullName,
      };
    } else {
      const student = await prisma.student.findUnique({
        where: { id: decoded.userId },
        include: {
          enrollments: {
            where: { paymentStatus: "paid" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { batchId: true, paymentStatus: true },
          },
        },
      });

      if (!student || student.status !== "active") {
        await deleteRefreshToken(decoded.userId);
        throw new UnauthorizedException("Account not found or suspended.");
      }

      const paid = student.enrollments[0];
      freshPayload = {
        userId: student.id,
        email: student.email,
        role: "student",
        fullName: student.fullName,
        studentCode: student.studentCode,
        batchId: paid?.batchId ?? undefined,
        paymentStatus: (paid?.paymentStatus as "paid" | "unpaid") ?? undefined,
      };
    }

    await setCachedUserProfile(decoded.userId, freshPayload);
  }

  // 5. Rotate — new pair, deviceId preserved
  return issueTokenPair(freshPayload, stored.deviceId);
};

// ─────────────────────────────────────────────────────────────
// LOGOUT
// Wipes refresh token + profile cache from Redis.
// Does NOT clear deviceId from DB — student stays registered
// to their device. Only professor can reset deviceId.
// ─────────────────────────────────────────────────────────────

export const logoutService = async (userId: string): Promise<void> => {
  await Promise.all([
    deleteRefreshToken(userId),
    invalidateUserProfile(userId),
  ]);
};

// ─────────────────────────────────────────────────────────────
// RESET STUDENT DEVICE
// Called by professor only via professor routes.
// Sets deviceId = null in DB so student can log in from
// any device on their next login (which re-registers it).
// Also wipes their active session from Redis.
// ─────────────────────────────────────────────────────────────

export const resetStudentDeviceService = async (
  studentId: string,
  professorId: string,
): Promise<void> => {
  // Verify student belongs to this professor
  const student = await prisma.student.findFirst({
    where: { id: studentId, professorId },
  });

  if (!student) {
    throw new NotFoundException("Student not found or does not belong to you.");
  }

  // Clear deviceId in DB + wipe active session in parallel
  await Promise.all([
    prisma.student.update({
      where: { id: studentId },
      data: { deviceId: null, deviceRegisteredAt: null },
    }),
    deleteRefreshToken(studentId),
    invalidateUserProfile(studentId),
  ]);
};

// ─────────────────────────────────────────────────────────────
// FORGOT PASSWORD  (unchanged)
// ─────────────────────────────────────────────────────────────

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

  await incrementResetRequestCount(email);

  const user =
    role === "professor"
      ? await prisma.professor.findUnique({ where: { email } })
      : await prisma.student.findUnique({ where: { email } });

  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  await setResetToken(token, { userId: user.id, email: user.email, role });
  await sendPasswordResetEmail(user.email, user.fullName, token);
};

// ─────────────────────────────────────────────────────────────
// RESET PASSWORD  (unchanged)
// ─────────────────────────────────────────────────────────────

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

  await Promise.all([
    role === "professor"
      ? prisma.professor.update({
          where: { id: userId },
          data: { password: hashedPassword },
        })
      : prisma.student.update({
          where: { id: userId },
          data: { password: hashedPassword },
        }),
    invalidateUserProfile(userId),
  ]);
};

// ─────────────────────────────────────────────────────────────
// GET ME  (cache-aside — unchanged)
// ─────────────────────────────────────────────────────────────

export const getMeService = async (
  userId: string,
  role: "professor" | "student",
) => {
  const cached = await getCachedUserProfile<unknown>(userId);
  if (cached) return cached;

  let profile: unknown;

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
    profile = { role: "professor", ...professor };
  } else {
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
            batch: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!student) throw new NotFoundException("Student not found.");

    const paid = student.enrollments[0] ?? null;
    profile = {
      role: "student",
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      studentCode: student.studentCode,
      status: student.status,
      createdAt: student.createdAt,
      activeBatch: paid?.batch ?? null,
      paymentStatus: paid?.paymentStatus ?? null,
    };
  }

  await setCachedUserProfile(userId, profile);
  return profile;
};
