export class ApiError extends Error {
  constructor(statusCode, message, errors = [], code = null, retryHint = null) {
    super(message);

    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.code = code;
    this.retryHint = retryHint;
    this.name = "ApiError";

    Error.captureStackTrace?.(this, this.constructor);
  }
}
