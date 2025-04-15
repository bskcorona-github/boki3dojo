import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../../utils/db";
import { Problem } from "../api-types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Problem ID is required" });
  }

  try {
    // データベースから問題を取得
    const problems = await query<Problem[]>(
      "SELECT * FROM problems WHERE id = ?",
      [id]
    );

    if (problems.length === 0) {
      return res.status(404).json({ error: "Problem not found" });
    }

    res.status(200).json(problems[0]);
  } catch (error) {
    console.error(`Error fetching problem with ID ${id}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
}
