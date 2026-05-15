import { Request, Response, NextFunction } from "express";
import { ForbiddenException } from "../utils/app.error.js";
import { UserRole } from "../type/Auth.types.js";

// ─────────────────────────────────────────────────────────────
// requireRole — always used after protectRoute
// ─────────────────────────────────────────────────────────────

const requireRole = (role: UserRole) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      throw new ForbiddenException(
        `Access denied. This route requires ${role} privileges.`,
      );
    }
    next();
  };

export const requireProfessor = requireRole("professor");
export const requireStudent   = requireRole("student");

// ─────────────────────────────────────────────────────────────
// requirePaidEnrollment
// Guards student content routes — batchId + paid status must
// exist in the JWT payload (set at login, refreshed on rotation).
// Zero DB hit — data lives in the token.
// ─────────────────────────────────────────────────────────────

export const requirePaidEnrollment = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.user?.role !== "student") {
    throw new ForbiddenException("This route is for students only.");
  }

  if (!req.user.batchId || req.user.paymentStatus !== "paid") {
    throw new ForbiddenException(
      "Content access requires a paid enrollment. Contact your professor.",
    );
  }

  next();
};