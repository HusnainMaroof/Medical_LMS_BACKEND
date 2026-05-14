// src/middlewares/error.middleware.ts

import "colors";
import { Request, Response, NextFunction } from "express";
import { HTTPSTATUS } from "../config/http.config.js";
import { AppError, ERROR_CODES } from "../utils/app.error.js";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // development logging
  console.log(`Error occurred: ${req.path}`.red, err);

  // Custom AppError handling
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errCode: err.errorCode,
    });
  }

  // fallback unknown error
  const message =
    err instanceof Error ? err.message : "Unknown error occurred";

  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error".red,
    error: message.red,
    errorCodes: ERROR_CODES.ERR_INTERNAL.red,
  });
};