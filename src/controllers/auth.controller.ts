import { Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config.js";
import {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from "../type/Auth.types.js";
import {
  forgotPasswordService,
  getMeService,
  loginService,
  logoutService,
  refreshTokenService,
  resetPasswordService,
  resetStudentDeviceService,
} from "../services/auth.service.js";

// ─────────────────────────────────────────────────────────────
// PARAM TYPES  — fixes "string | string[] | undefined" error
// ─────────────────────────────────────────────────────────────

type StudentIdParam = { studentId: string };

// ─────────────────────────────────────────────────────────────
// COOKIE CONFIG
// ─────────────────────────────────────────────────────────────

const REFRESH_COOKIE     = "refreshToken";
const REFRESH_COOKIE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days
const IS_PROD            = process.env.NODE_ENV === "production";

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    maxAge:   REFRESH_COOKIE_TTL,
    path:     "/api/auth/refresh",
  });
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth/refresh" });
};

// ─────────────────────────────────────────────────────────────
// DEVICE ID HELPER
// Reads X-Device-ID header — returns null if missing/invalid
// ─────────────────────────────────────────────────────────────

const getDeviceId = (req: Request): string | null => {
  const id = req.headers["x-device-id"];
  return typeof id === "string" && id.trim() ? id.trim() : null;
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────

export const loginController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, password, role } = req.body as LoginInput;

  const deviceId = role === "student" ? getDeviceId(req) : null;

  const { tokens, user } = await loginService(
    { email, password, role },
    deviceId,
  );

  setRefreshCookie(res, tokens.refreshToken);

  res.status(HTTPSTATUS.OK).json({
    message:     "Login successful.",
    accessToken: tokens.accessToken,
    user: {
      id:       user.userId,
      email:    user.email,
      role:     user.role,
      fullName: user.fullName,
      ...(user.role === "student" && {
        studentCode:   user.studentCode,
        batchId:       user.batchId       ?? null,
        paymentStatus: user.paymentStatus ?? null,
      }),
    },
  });
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────

export const refreshController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const incomingToken: string | undefined = req.cookies?.[REFRESH_COOKIE];

  if (!incomingToken) {
    res
      .status(HTTPSTATUS.UNAUTHORIZED)
      .json({ message: "No refresh token. Please log in." });
    return;
  }

  const deviceId = getDeviceId(req);

  const { accessToken, refreshToken } = await refreshTokenService(
    incomingToken,
    deviceId,
  );

  setRefreshCookie(res, refreshToken);

  res.status(HTTPSTATUS.OK).json({ accessToken });
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────

export const logoutController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  await logoutService(req.user!.userId);
  clearRefreshCookie(res);
  res.status(HTTPSTATUS.OK).json({ message: "Logged out successfully." });
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────

export const forgotPasswordController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, role } = req.body as ForgotPasswordInput;
  await forgotPasswordService({ email, role });
  res.status(HTTPSTATUS.OK).json({
    message: "If an account with that email exists, a reset link has been sent.",
  });
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────

export const resetPasswordController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token, newPassword } = req.body as ResetPasswordInput;
  await resetPasswordService({ token, newPassword });
  res.status(HTTPSTATUS.OK).json({
    message: "Password reset successfully. Please log in.",
  });
};

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────

export const getMeController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId, role } = req.user!;
  const userData = await getMeService(userId, role);
  res.status(HTTPSTATUS.OK).json({ user: userData });
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/auth/student/:studentId/device
//
// Request<StudentIdParam> tells TypeScript that req.params.studentId
// is guaranteed to be a string — fixes the
// "string | string[] | undefined" error entirely.
// ─────────────────────────────────────────────────────────────

export const resetStudentDeviceController = async (
  req: Request<StudentIdParam>,
  res: Response,
): Promise<void> => {
  const { studentId } = req.params; // ✅ typed as string
  const professorId   = req.user!.userId;

  await resetStudentDeviceService(studentId, professorId);

  res.status(HTTPSTATUS.OK).json({
    message: "Device reset successfully. Student can now log in from a new device.",
  });
};