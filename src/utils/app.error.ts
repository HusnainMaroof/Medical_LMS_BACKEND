// from src/utils/app.error.ts


import { HTTPSTATUS, HttpStatus } from "../config/http.config.js";

export const ERROR_CODES = {
  ERR_INTERNAL: "ERR_INTERNAL",
  ERR_BAD_REQUEST: "ERR_BAD_REQUEST",
  ERR_UNAUTHORIZED: "ERR_UNAUTHORIZED",
  ERR_FORBIDDEN: "ERR_FORBIDDEN",
  ERR_NOT_FOUND: "ERR_NOT_FOUND",
  ERR_VALIDATION: "ERR_VALIDATION",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  public readonly statusCode: HttpStatus;
  public readonly errorCode: ErrorCode;

  constructor(
    message: string,
    statusCode: HttpStatus = HTTPSTATUS.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode = ERROR_CODES.ERR_INTERNAL,
  ) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode;

    Object.setPrototypeOf(this, new.target.prototype);

    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class InternalServerException extends AppError {
  constructor(message = "Internal Server Error") {
    super(message, HTTPSTATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.ERR_INTERNAL);
  }
}

export class NotFoundException extends AppError {
  constructor(message = "Resource Not Found") {
    super(message, HTTPSTATUS.NOT_FOUND, ERROR_CODES.ERR_NOT_FOUND);
  }
}

export class BadRequestException extends AppError {
  constructor(message = "Bad Request") {
    super(message, HTTPSTATUS.BAD_REQUEST, ERROR_CODES.ERR_BAD_REQUEST);
  }
}

export class UnauthorizedException extends AppError {
  constructor(message = "Unauthorized Access") {
    super(message, HTTPSTATUS.UNAUTHORIZED, ERROR_CODES.ERR_UNAUTHORIZED);
  }
}

export class ForbiddenException extends AppError {
  constructor(message = "Access Forbidden") {
    super(message, HTTPSTATUS.FORBIDDEN, ERROR_CODES.ERR_FORBIDDEN);
  }
}