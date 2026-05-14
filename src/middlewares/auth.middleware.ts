import { Request, Response, NextFunction } from "express";
import { UnauthorizedException } from "../utils/app.error.js";

// ======================================================
// protectRoute
// Validates active session, populates req.user from session.
// No DB hit — session is the source of truth.
// ======================================================
export const protectRoute = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.session?.userId) {
    throw new UnauthorizedException("No active session. Please log in.");
  }

  req.user = {
    id: req.session.userId,
    email: req.session.email!,
    role: req.session.role!,
    fullName: req.session.fullName!,

    // Student-only — undefined for professor
    studentCode: req.session.studentCode,
    batchId: req.session.batchId,
    paymentStatus: req.session.paymentStatus,
  };

  next();
};