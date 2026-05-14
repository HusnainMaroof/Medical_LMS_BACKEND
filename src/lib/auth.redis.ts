import { redis } from "../config/redis.js";
import { ResetTokenPayload } from "../type/Auth.types.js";

const TTL = {
  RESET_TOKEN: 60 * 15, // 15 minutes
  LOGIN_LOCKOUT: 60 * 15, // 15 minutes
  RESET_RATELIMIT: 60 * 60, // 1 hour
} as const;

const keys = {
  resetToken: (token: string) => `reset:${token}`,
  loginRateLimit: (email: string) => `ratelimit:login:${email.toLowerCase()}`,
  resetRateLimit: (email: string) => `ratelimit:reset:${email.toLowerCase()}`,
} as const;

// ======================================================
// RESET TOKEN
// ======================================================

// Upstash auto-serializes objects — no JSON.stringify needed
export const setResetToken = async (
  token: string,
  payload: ResetTokenPayload,
): Promise<void> => {
  await redis.set(keys.resetToken(token), payload, { ex: TTL.RESET_TOKEN });
};

// Pipeline: GET + DEL in one HTTP round-trip
// Prevents replay attack — token deleted the moment it's read
export const consumeResetToken = async (
  token: string,
): Promise<ResetTokenPayload | null> => {
  const key = keys.resetToken(token);

  const pipeline = redis.pipeline();
  pipeline.get<ResetTokenPayload>(key);
  pipeline.del(key);

  const [payload] = await pipeline.exec<[ResetTokenPayload | null, number]>();
  return payload ?? null;
};

// ======================================================
// LOGIN RATE LIMITING — 5 failures → 15min lockout
// ======================================================

export const getLoginFailures = async (email: string): Promise<number> => {
  const val = await redis.get<number>(keys.loginRateLimit(email));
  return val ?? 0;
};

// Pipeline: INCR + EXPIRE in one HTTP round-trip
export const incrementLoginFailures = async (email: string): Promise<void> => {
  const key = keys.loginRateLimit(email);
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, TTL.LOGIN_LOCKOUT);
  await pipeline.exec();
};

export const clearLoginFailures = async (email: string): Promise<void> => {
  await redis.del(keys.loginRateLimit(email));
};

// ======================================================
// RESET RATE LIMITING — 3 requests/hour
// ======================================================

export const getResetRequestCount = async (email: string): Promise<number> => {
  const val = await redis.get<number>(keys.resetRateLimit(email));
  return val ?? 0;
};

export const incrementResetRequestCount = async (
  email: string,
): Promise<void> => {
  const key = keys.resetRateLimit(email);
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, TTL.RESET_RATELIMIT);
  await pipeline.exec();
};
