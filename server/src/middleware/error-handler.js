import { ApiError } from "../utils/ApiError.js";

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isZodError = err?.name === "ZodError";
  const isApiError = err instanceof ApiError || err?.name === "ApiError";

  const statusCode = isZodError
    ? 400
    : Number.isInteger(err.statusCode) &&
        err.statusCode >= 400 &&
        err.statusCode <= 599
      ? err.statusCode
      : Number.isInteger(err.status) &&
          err.status >= 400 &&
          err.status <= 599
        ? err.status
        : 500;

  if (statusCode >= 500 && !isApiError) {
    console.error(err);
  }

  const errorMessage = isZodError
    ? err.issues.map((issue) => issue.message).join(", ")
    : isApiError
      ? err.message
      : statusCode >= 500
        ? "Internal server error"
        : err.message || "Request failed";

  return res.status(statusCode).json({
    success: false,
    message: errorMessage,
    ...(err?.code ? { code: err.code } : {}),
    ...(err?.retryHint ? { retryHint: err.retryHint } : {}),
  });
}

export default errorHandler;
