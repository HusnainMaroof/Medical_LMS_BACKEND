import jwt, { SignOptions } from "jsonwebtoken";
import { envConfig } from "../config/envConfig.js";

// ─────────────────────────────────────────────────────────────
// SHAPES
// ─────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: "professor" | "student";
  fullName: string;
  // Student-only
  studentCode?: string;
  batchId?: string;
  paymentStatus?: "paid" | "unpaid";
}

export interface RefreshTokenPayload {
  userId: string;
  role: "professor" | "student";
}

// ─────────────────────────────────────────────────────────────
// TTL CONSTANTS  (single source of truth)
// ─────────────────────────────────────────────────────────────

export const ACCESS_TOKEN_TTL         = "15m";
export const REFRESH_TOKEN_TTL        = "7d";
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // Redis ex:
export const USER_CACHE_TTL_SECONDS   = 60 * 5;            // 5 min — getMe cache

// ─────────────────────────────────────────────────────────────
// SIGN
// ─────────────────────────────────────────────────────────────

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, envConfig.SECRET.ACCESS_TOKEN_SECRET!, {
    expiresIn: ACCESS_TOKEN_TTL,
  } as SignOptions);

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, envConfig.SECRET.REFRESH_TOKEN_SECRET!, {
    expiresIn: REFRESH_TOKEN_TTL,
  } as SignOptions);

// ─────────────────────────────────────────────────────────────
// VERIFY
// ─────────────────────────────────────────────────────────────

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, envConfig.SECRET.ACCESS_TOKEN_SECRET!) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, envConfig.SECRET.REFRESH_TOKEN_SECRET!) as RefreshTokenPayload;