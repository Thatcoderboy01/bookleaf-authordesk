
import jwt from "jsonwebtoken";
import prisma from "../config/database.js";
import { ApiError } from "../utils/ApiError.js";

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentication token is required");
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new ApiError(401, "Authentication token is required");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new ApiError(401, "Invalid or expired authentication token");
    }

    if (
      typeof payload !== "object" ||
      typeof payload.sub !== "string"
    ) {
      throw new ApiError(401, "Invalid authentication token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new ApiError(401, "User account not found");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
