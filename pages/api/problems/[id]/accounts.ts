import type { NextApiRequest, NextApiResponse } from "next";
import { query, getDefaultAccountItems } from "../../../../utils/db";
import { AccountItem } from "../../api-types";

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
    // 問題に関連する勘定科目を取得（問題テーブルから関連勘定科目の情報を取得する実装）
    // generate-problem.tsでは problem_accounts テーブルを使用しているので、それに合わせる
    const accountItems = await query<AccountItem[]>(
      `SELECT ai.* FROM account_items ai
       INNER JOIN problem_accounts pa ON ai.id = pa.account_id
       WHERE pa.problem_id = ?
       ORDER BY ai.id`,
      [id]
    );

    // 関連勘定科目が見つからない場合はデフォルトのリストを返す
    if (accountItems.length === 0) {
      // すべての勘定科目を返す
      const allAccountItems = await query<AccountItem[]>(
        "SELECT * FROM account_items ORDER BY id"
      );

      if (allAccountItems.length === 0) {
        // それでも見つからない場合はハードコードされたデフォルト値を使用
        return res.status(200).json(getDefaultAccountItems());
      }

      return res.status(200).json(allAccountItems);
    }

    res.status(200).json(accountItems);
  } catch (error) {
    console.error(`Error fetching account items for problem ${id}:`, error);
    // エラー時はデフォルトの勘定科目リストを返す
    const defaultItems = getDefaultAccountItems();
    res.status(200).json(defaultItems);
  }
}
