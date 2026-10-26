
import {
  getRoyaltySummary,
  getRoyaltyRecords,
} from "./royalty.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export async function getRoyaltySummaryController(req, res) {
  const summary = await getRoyaltySummary(req.user);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        summary,
        "Royalty summary fetched successfully"
      )
    );
}

export async function getRoyaltyRecordsController(req, res) {
  const records = await getRoyaltyRecords(req.user);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        records,
        "Royalty records fetched successfully"
      )
    );
}
