// src/config/cors.config.ts

import cors from "cors";
import type { CorsOptions } from "cors";
import { envConfig } from "./envConfig.js";

const allowedOrigins = new Set<string>([
  envConfig.ORIGINS.FRONTEND_ORIGIN!,
  envConfig.ORIGINS.BACKEND_ORIGIN!,
]);

if (!allowedOrigins.has(envConfig.ORIGINS.FRONTEND_ORIGIN!)) {
  allowedOrigins.add(envConfig.ORIGINS.FRONTEND_ORIGIN!);
  throw new Error("FRONTEND_ORIGIN is not defined in environment variables");
}

if (!allowedOrigins.has(envConfig.ORIGINS.BACKEND_ORIGIN!)) {
  allowedOrigins.add(envConfig.ORIGINS.BACKEND_ORIGIN!);
  throw new Error("BACKEND_ORIGIN is not defined in environment variables");
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    try {
      // Allow mobile apps, Postman, server requests
      if (!origin) {
        return callback(null, true);
      }

      // Allow trusted origins
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      console.error(`❌ CORS Blocked: ${origin}`);

      return callback(new Error("CORS: Origin not allowed"));
    } catch (error) {
      console.error("❌ Internal CORS Error:", error);

      return callback(new Error("Internal CORS Error"));
    }
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization"],

  exposedHeaders: ["Set-Cookie"],

  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions);
