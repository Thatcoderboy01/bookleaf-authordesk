
import { getBooks, getBookById } from "./book.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export async function listBooks(req, res, next) {
  try {
    const books = await getBooks(req.user);

    return res
      .status(200)
      .json(new ApiResponse(200, { books }, "Books fetched successfully"));
  } catch (error) {
    next(error);
  }
}

export async function getBookDetails(req, res, next) {
  try {
    const book = await getBookById(req.params.id, req.user);

    return res
      .status(200)
      .json(new ApiResponse(200, { book }, "Book fetched successfully"));
  } catch (error) {
    next(error);
  }
}
