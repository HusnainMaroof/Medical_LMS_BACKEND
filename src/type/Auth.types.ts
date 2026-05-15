// ─────────────────────────────────────────────────────────────
// INPUT TYPES
// ─────────────────────────────────────────────────────────────

export type UserRole = "professor" | "student";

export interface LoginInput {
  email: string;
  password: string;
  role: UserRole;
}

export interface ForgotPasswordInput {
  email: string;
  role: UserRole;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

// ─────────────────────────────────────────────────────────────
// INTERNAL SERVICE SHAPE
// Returned by loginService, used to build tokens + response body.
// ─────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  // Student-only
  studentCode?: string;
  batchId?: string;
  paymentStatus?: "paid" | "unpaid";
}

// ─────────────────────────────────────────────────────────────
// REDIS SHAPES
// ─────────────────────────────────────────────────────────────

export interface ResetTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// ─────────────────────────────────────────────────────────────
// LOGIN SERVICE RETURN
// ─────────────────────────────────────────────────────────────

export interface LoginResult {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: SessionPayload;
}
