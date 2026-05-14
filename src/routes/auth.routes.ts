import { Router } from "express";
import { asyncHandler } from "../middlewares/Async.middleware.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  forgotPasswordController,
  getMeController,
  loginController,
  logoutController,
  resetPasswordController,
} from "../controllers/auth.controller.js";

const authRouter = Router();

// ======================================================
// PUBLIC
// ======================================================
authRouter.post("/login", asyncHandler(loginController));
authRouter.post("/forgot-password", asyncHandler(forgotPasswordController));
authRouter.post("/reset-password", asyncHandler(resetPasswordController));

// ======================================================
// PROTECTED — valid session required
// ======================================================
authRouter.get("/me", protectRoute, asyncHandler(getMeController));
authRouter.post("/logout", protectRoute, asyncHandler(logoutController));

export default authRouter;
