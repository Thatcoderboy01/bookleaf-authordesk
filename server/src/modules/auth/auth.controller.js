
import { registerUser, loginUser } from "./auth.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export async function register(req, res, next) {
  try {
    const result = await registerUser(req.body);

    return res
      .status(201)
      .json(new ApiResponse(201, result, "Registration successful"));
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await loginUser(req.body);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Login successful"));
  } catch (error) {
    next(error);
  }
}
