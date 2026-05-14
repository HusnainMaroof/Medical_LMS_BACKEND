export type UserRole = "professor" | "student";

export type LoginInput = {
  email: string;
  password: string;
  role: UserRole;
};

export type ForgotPasswordInput = {
  email: string;
  role: UserRole;
};

export type ResetPasswordInput = {
  token: string;
  newPassword: string;
};

// ======================================================
// SESSION PAYLOADS
// Discriminated union — TypeScript forces role narrowing
// before accessing student-only fields.
// ======================================================

export type ProfessorSessionPayload = {
  userId: string;
  email: string;
  role: "professor";
  fullName: string;
};

export type StudentSessionPayload = {
  userId: string;
  email: string;
  role: "student";
  fullName: string;
  studentCode: string;
  batchId?: string;
  paymentStatus?: "paid" | "unpaid";
};

export type SessionPayload = ProfessorSessionPayload | StudentSessionPayload;

// ======================================================
// RESET TOKEN — stored in Redis, role embedded here.
// Never trust role from client on /reset-password.
// ======================================================

export type ResetTokenPayload = {
  userId: string;
  email: string;
  role: UserRole;
};
