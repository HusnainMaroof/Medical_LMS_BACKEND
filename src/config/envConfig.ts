import dotenv from "dotenv";

dotenv.config();
// src/config/envConfig.ts
type EmailConfig = {
  BREVO_SMTP_SDK_KEY?: string;
  EMAIL_FROM?: string;
};

type RedisConfig = {
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_USERNAME?: string;
  REDIS_PASSWORD?: string;
  REDIS_URL?: string;
  REDIS_TOKEN?: string;
};

type SecretConfig = {
  SESSION_SECRET?: string;
  ACCESS_TOKEN_SECRET?: string;
  REFRESH_TOKEN_SECRET?: string;
};

type ORIGINS = {
  FRONTEND_ORIGIN: string;
  BACKEND_ORIGIN: string;
};

export const envConfig = {
  DATABASE_URL: process.env.DATABASE_URL,

  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,

  EMAIL_CONFIG: {
    BREVO_SMTP_SDK_KEY: process.env.BREVO_SMTP_SDK_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  } satisfies EmailConfig,

  REDIS_CONFIG: {
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_USERNAME: process.env.REDIS_USERNAME,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_TOKEN: process.env.REDIS_TOKEN,
  } satisfies RedisConfig,

  SECRET: {
    SESSION_SECRET: process.env.SESSION_SECRET,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  } satisfies SecretConfig,

  ORIGINS: {
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN!,
    BACKEND_ORIGIN: process.env.BACKEND_ORIGIN!,
  } satisfies ORIGINS,
};

const requiredEnvVars = [
  "DATABASE_URL",
  "FRONTEND_ORIGIN",
  "BACKEND_ORIGIN",
  "SESSION_SECRET",
];

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`❌ Missing required env variable: ${key}`);
  }
}
