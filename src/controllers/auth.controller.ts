import { Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config.js";
import { ForgotPasswordInput, LoginInput, ResetPasswordInput } from "../type/Auth.types.js";
import { forgotPasswordService, getMeService, loginService, resetPasswordService } from "../services/auth.service.js";


// ======================================================
// POST /auth/login
// Body: { email, password, role: "professor" | "student" }
// ======================================================
export const loginController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, password, role } = req.body as LoginInput;

  const payload = await loginService({ email, password, role });

  // Regenerate session ID before writing — prevents session fixation
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });

  req.session.userId = payload.userId;
  req.session.email = payload.email;
  req.session.role = payload.role;
  req.session.fullName = payload.fullName;

  if (payload.role === "student") {
    req.session.studentCode = payload.studentCode;
    req.session.batchId = payload.batchId;
    req.session.paymentStatus = payload.paymentStatus;
  }

  res.status(HTTPSTATUS.OK).json({
    message: "Login successful.",
    user: {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
      ...(payload.role === "student" && {
        studentCode: payload.studentCode,
        batchId: payload.batchId ?? null,
        paymentStatus: payload.paymentStatus ?? null,
      }),
    },
  });
};

// ======================================================
// POST /auth/logout
// ======================================================
export const logoutController = async (
  req: Request,
  res: Response
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });

  const cookieName =
    process.env.NODE_ENV === "production" ? "__Host-authSessionId" : "sessionId";

  res.clearCookie(cookieName);
  res.status(HTTPSTATUS.OK).json({ message: "Logged out successfully." });
};

// ======================================================
// POST /auth/forgot-password
// Body: { email, role }
// Always returns 200 — never reveals if email exists
// ======================================================
export const forgotPasswordController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, role } = req.body as ForgotPasswordInput;

  await forgotPasswordService({ email, role });

  res.status(HTTPSTATUS.OK).json({
    message:
      "If an account with that email exists, a reset link has been sent.",
  });
};

// ======================================================
// POST /auth/reset-password
// Body: { token, newPassword }
// Role comes from Redis — never from client
// ======================================================
export const resetPasswordController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token, newPassword } = req.body as ResetPasswordInput;

  await resetPasswordService({ token, newPassword });

  res.status(HTTPSTATUS.OK).json({
    message: "Password reset successfully. Please log in.",
  });
};

// ======================================================
// GET /auth/me
// ======================================================
export const getMeController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id, role } = req.user!;

  const userData = await getMeService(id!, role);

  res.status(HTTPSTATUS.OK).json({ user: userData });
};