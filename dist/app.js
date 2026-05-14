// src/app.ts
import express from "express";
import dotenv from "dotenv";
import { corsMiddleware } from "./config/cors.config.js";
dotenv.config();
const app = express();
// Middlewares
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Medical LMS Backend is running 🚀",
    });
});
export default app;
//# sourceMappingURL=app.js.map