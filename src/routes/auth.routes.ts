import { Router } from "express";
import { asyncHandler } from "../middlewares/Async.middleware.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { requireProfessor } from "..//middlewares/role.moddleware.js";
import {
  forgotPasswordController,
  getMeController,
  loginController,
  logoutController,
  refreshController,
  resetPasswordController,
  resetStudentDeviceController,
} from "../controllers/auth.controller.js";

const authRouter = Router();

// ─────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────

authRouter.post("/login", asyncHandler(loginController));
authRouter.post("/refresh", asyncHandler(refreshController));
authRouter.post("/forgot-password", asyncHandler(forgotPasswordController));
authRouter.post("/reset-password", asyncHandler(resetPasswordController));

// ─────────────────────────────────────────────────────────────
// PROTECTED — valid Bearer token required
// ─────────────────────────────────────────────────────────────

authRouter.get("/me", protectRoute, asyncHandler(getMeController));
authRouter.post("/logout", protectRoute, asyncHandler(logoutController));

// ─────────────────────────────────────────────────────────────
// PROFESSOR ONLY
// Reset a student's registered device.
// Student can log in from a new device on their next login.
//
// DELETE /api/auth/student/:studentId/device
// ─────────────────────────────────────────────────────────────

authRouter.delete(
  "/student/:studentId/device",
  protectRoute,
  requireProfessor,
  asyncHandler(resetStudentDeviceController),
);

export default authRouter;
