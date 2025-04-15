import type { NextApiRequest, NextApiResponse } from "next";
import { query, getDefaultAccountItems } from "../../utils/db";
import { AccountItem } from "./api-types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // データベースから勘定科目を取得
    const accountItems = await query<AccountItem[]>(
      "SELECT * FROM account_items ORDER BY id"
    );

    res.status(200).json(accountItems);
  } catch (error) {
    console.error("Error fetching account items from database:", error);
    // データベースエラー時はデフォルトデータを返す
    const defaultItems = getDefaultAccountItems();
    res.status(200).json(defaultItems);
  }
}
