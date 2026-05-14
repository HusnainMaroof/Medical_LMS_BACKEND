import dotenv from "dotenv";
dotenv.config();
export const envConfig = {
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    // ======================================================
    // NODE ENV
    // ======================================================
    NODE_ENV: process.env.NODE_ENV,
    // ======================================================
    // EMAIL CONFIG
    // ======================================================
    EMAIL_CONFIG: {
        BREVO_SMTP_SDK_KEY: process.env.BREVO_SMTP_SDK_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM,
    },
    // ======================================================
    // REDIS CONFIG
    // ======================================================
    REDIS_CONFIG: {
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_USERNAME: process.env.REDIS_USERNAME,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    },
    // ======================================================
    // SECRET
    // ======================================================
    SECRET: {
        SESSION_SECRET: process.env.SESSION_SECRET,
    },
    // ======================================================
    // CORS / ORIGINS
    // ======================================================
    ORIGINS: {
        FRONTEND_ORIGINS: process.env.FRONTEND_ORIGINS?.split(",") || [],
    },
    // ======================================================
    // GOOGLE OAUTH
    // ======================================================
    GOOGLE_CONFIG: {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRETS: process.env.GOOGLE_CLIENT_SECRETS,
    },
};
//# sourceMappingURL=envConfig.js.map