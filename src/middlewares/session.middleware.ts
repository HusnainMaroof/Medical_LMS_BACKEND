import session, { Store } from "express-session";
import { redis } from "../config/redis.js";
import { envConfig } from "../config/envConfig.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

class UpstashSessionStore extends Store {
  private readonly prefix = "sess:";

  private key(sid: string): string {
    return `${this.prefix}${sid}`;
  }

  private getTTL(sessionData: session.SessionData): number {
    if (sessionData?.cookie?.maxAge) {
      return Math.floor(sessionData.cookie.maxAge / 1000);
    }
    return SESSION_TTL_SECONDS;
  }

  async get(
    sid: string,
    callback: (err: unknown, session?: session.SessionData | null) => void
  ): Promise<void> {
    try {
      const data = await redis.get<session.SessionData>(this.key(sid));
      callback(null, data ?? null);
    } catch (err) {
      callback(err);
    }
  }

  async set(
    sid: string,
    sessionData: session.SessionData,
    callback?: (err?: unknown) => void
  ): Promise<void> {
    try {
      const ttl = this.getTTL(sessionData);
      await redis.set(this.key(sid), sessionData, { ex: ttl });
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  async destroy(
    sid: string,
    callback?: (err?: unknown) => void
  ): Promise<void> {
    try {
      await redis.del(this.key(sid));
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  async touch(
    sid: string,
    sessionData: session.SessionData,
    callback?: (err?: unknown) => void
  ): Promise<void> {
    try {
      const ttl = this.getTTL(sessionData);
      await redis.expire(this.key(sid), ttl);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }
}

// ======================================================
// SESSION MIDDLEWARE
// ======================================================
export const sessionsMiddleware = session({
  store: new UpstashSessionStore(),

  secret: envConfig.SECRET.SESSION_SECRET!,

  name:
    envConfig.NODE_ENV === "production" ? "__Host-authSessionId" : "sessionId",

  resave: false,
  saveUninitialized: false,
  rolling: true,

  cookie: {
    httpOnly: true,
    secure: envConfig.NODE_ENV === "production",
    sameSite: envConfig.NODE_ENV === "production" ? "none" : "lax",
    maxAge: SESSION_TTL_MS,
  },
});