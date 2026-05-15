import { redis } from "../config/redis.js";
import { ResetTokenPayload } from "../type/Auth.types.js";
import { REFRESH_TOKEN_TTL_SECONDS, USER_CACHE_TTL_SECONDS } from "../utils/jwt.utli.js";

// ─────────────────────────────────────────────────────────────
// TTL
// ─────────────────────────────────────────────────────────────

const TTL = {
  RESET_TOKEN:     60 * 15,
  LOGIN_LOCKOUT:   60 * 15,
  RESET_RATELIMIT: 60 * 60,
  USER_PROFILE:    USER_CACHE_TTL_SECONDS,
} as const;

// ─────────────────────────────────────────────────────────────
// KEYS
// ─────────────────────────────────────────────────────────────

export const cacheKeys = {
  refreshToken:   (userId: string) => `refresh:${userId}`,
  resetToken:     (token: string)  => `reset:${token}`,
  loginRateLimit: (email: string)  => `ratelimit:login:${email.toLowerCase()}`,
  resetRateLimit: (email: string)  => `ratelimit:reset:${email.toLowerCase()}`,
  userProfile:    (userId: string) => `profile:${userId}`,
} as const;

// ─────────────────────────────────────────────────────────────
// REFRESH TOKEN STORE
//
// STUDENTS  → { token, deviceId: "abc-xyz" }
//   deviceId validated on every /refresh call.
//   Mismatch → reject + wipe → force re-login.
//
// PROFESSORS → { token, deviceId: null }
//   deviceId check skipped entirely for professors.
// ─────────────────────────────────────────────────────────────

export interface StoredRefreshToken {
  token:    string;
  deviceId: string | null;
}

export const saveRefreshToken = async (
  userId:   string,
  token:    string,
  deviceId: string | null,
): Promise<void> => {
  const value: StoredRefreshToken = { token, deviceId };
  await redis.set(
    cacheKeys.refreshToken(userId),
    JSON.stringify(value),
    { ex: REFRESH_TOKEN_TTL_SECONDS },
  );
};

export const getStoredRefreshToken = async (
  userId: string,
): Promise<StoredRefreshToken | null> => {
  const raw = await redis.get<string>(cacheKeys.refreshToken(userId));
  if (!raw) return null;
  try {
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as StoredRefreshToken;
  } catch {
    return null;
  }
};

export const deleteRefreshToken = async (userId: string): Promise<void> => {
  await redis.del(cacheKeys.refreshToken(userId));
};

// ─────────────────────────────────────────────────────────────
// USER PROFILE CACHE  (cache-aside, 5min TTL)
// ─────────────────────────────────────────────────────────────

export const getCachedUserProfile = async <T>(
  userId: string,
): Promise<T | null> => {
  const raw = await redis.get<string>(cacheKeys.userProfile(userId));
  if (!raw) return null;
  try {
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
  } catch {
    return null;
  }
};

export const setCachedUserProfile = async (
  userId:  string,
  profile: unknown,
): Promise<void> => {
  await redis.set(
    cacheKeys.userProfile(userId),
    JSON.stringify(profile),
    { ex: TTL.USER_PROFILE },
  );
};

export const invalidateUserProfile = async (userId: string): Promise<void> => {
  await redis.del(cacheKeys.userProfile(userId));
};

// ─────────────────────────────────────────────────────────────
// RESET TOKEN  (atomic GET + DEL — prevents replay)
// ─────────────────────────────────────────────────────────────

export const setResetToken = async (
  token:   string,
  payload: ResetTokenPayload,
): Promise<void> => {
  await redis.set(cacheKeys.resetToken(token), payload, {
    ex: TTL.RESET_TOKEN,
  });
};

export const consumeResetToken = async (
  token: string,
): Promise<ResetTokenPayload | null> => {
  const key = cacheKeys.resetToken(token);
  const pipeline = redis.pipeline();
  pipeline.get<ResetTokenPayload>(key);
  pipeline.del(key);
  const [payload] = await pipeline.exec<[ResetTokenPayload | null, number]>();
  return payload ?? null;
};

// ─────────────────────────────────────────────────────────────
// LOGIN RATE LIMITING
// ─────────────────────────────────────────────────────────────

export const getLoginFailures = async (email: string): Promise<number> => {
  const val = await redis.get<number>(cacheKeys.loginRateLimit(email));
  return val ?? 0;
};

export const incrementLoginFailures = async (email: string): Promise<void> => {
  const key = cacheKeys.loginRateLimit(email);
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, TTL.LOGIN_LOCKOUT);
  await pipeline.exec();
};

export const clearLoginFailures = async (email: string): Promise<void> => {
  await redis.del(cacheKeys.loginRateLimit(email));
};

// ─────────────────────────────────────────────────────────────
// RESET RATE LIMITING
// ─────────────────────────────────────────────────────────────

export const getResetRequestCount = async (email: string): Promise<number> => {
  const val = await redis.get<number>(cacheKeys.resetRateLimit(email));
  return val ?? 0;
};

export const incrementResetRequestCount = async (
  email: string,
): Promise<void> => {
  const key = cacheKeys.resetRateLimit(email);
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, TTL.RESET_RATELIMIT);
  await pipeline.exec();
};