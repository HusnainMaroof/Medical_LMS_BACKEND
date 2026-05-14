import cors from "cors";
import { envConfig } from "./envConfig.js";
const allowedOrigins = new Set(envConfig.ORIGINS.FRONTEND_ORIGINS);
export const corsOptions = {
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
        }
        catch (error) {
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
//# sourceMappingURL=cors.config.js.map