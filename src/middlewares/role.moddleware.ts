import { Request, Response, NextFunction } from "express";
import { ForbiddenException } from "../utils/app.error.js";
import { UserRole } from "../type/Auth.types.js";

// ======================================================
// requireRole — factory, always used after protectRoute
// ======================================================
const requireRole = (role: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      throw new ForbiddenException(
        `Access denied. This route requires ${role} privileges.`
      );
    }
    next();
  };
};

export const requireProfessor = requireRole("professor");
export const requireStudent = requireRole("student");

// ======================================================
// requirePaidEnrollment
// Guards student content routes.
// Student must have batchId + paymentStatus = paid in session.
// Both are set at login — no DB hit here.
// ======================================================
export const requirePaidEnrollment = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== "student") {
    throw new ForbiddenException("This route is for students only.");
  }

  if (!req.user.batchId || req.user.paymentStatus !== "paid") {
    throw new ForbiddenException(
      "Content access requires a paid enrollment. Contact your professor."
    );
  }

  next();
};