// src/app.ts
import express from "express";
import { corsMiddleware } from "./config/cors.config.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { sessionsMiddleware } from "./middlewares/session.middleware.js";
import authRouter from "./routes/auth.routes.js";
import { professorRoutes } from "./routes/professor.routes.js";

const app = express();

app.use(corsMiddleware);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionsMiddleware);

app.use("/api/auth", authRouter);
app.use("/professor", professorRoutes);

app.use(errorHandler);

export default app;
