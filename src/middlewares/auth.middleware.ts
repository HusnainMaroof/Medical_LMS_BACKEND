import { Request, Response, NextFunction } from "express";
import { UnauthorizedException } from "../utils/app.error.js";
import { verifyAccessToken } from "../utils/jwt.utli.js";

// ─────────────────────────────────────────────────────────────
// protectRoute
//
// Reads Bearer token from Authorization header.
// Verifies JWT signature + expiry — zero Redis, zero DB.
// All user data comes from the token payload.
//
// Device ID validation is NOT done here — it lives in:
//   loginService     (on login)
//   refreshService   (on every token rotation)
//
// This keeps protectRoute fast — every API call goes through
// it, so it must stay a pure CPU operation (no I/O).
// ─────────────────────────────────────────────────────────────

export const protectRoute = (
  req:  Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedException("No token provided. Please log in.");
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      userId:        payload.userId,
      id:            payload.userId, // alias for professor controller backward compat
      email:         payload.email,
      role:          payload.role,
      fullName:      payload.fullName,
      studentCode:   payload.studentCode,
      batchId:       payload.batchId,
      paymentStatus: payload.paymentStatus,
    };

    next();
  } catch {
    throw new UnauthorizedException(
      "Session expired or invalid. Please log in again.",
    );
  }
};