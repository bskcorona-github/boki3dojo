import mysql from "mysql2/promise";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { QueryResult } from "../pages/api/api-types";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "boki3dojo",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// MySQL接続プールの作成
const pool = mysql.createPool(dbConfig);

// クエリを実行する関数
export async function query<T>(sql: string, params?: any[]): Promise<T> {
  try {
    const [results] = await pool.execute(sql, params);
    return results as T;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

// 主要な勘定科目データを返す（データベースエラー時のフォールバック）
export function getDefaultAccountItems() {
  return [
    { id: 1, name: "現金", type: "資産" },
    { id: 2, name: "当座預金", type: "資産" },
    { id: 3, name: "普通預金", type: "資産" },
    { id: 4, name: "売掛金", type: "資産" },
    { id: 5, name: "商品", type: "資産" },
    { id: 6, name: "買掛金", type: "負債" },
    { id: 7, name: "借入金", type: "負債" },
    { id: 8, name: "資本金", type: "純資産" },
    { id: 9, name: "売上", type: "収益" },
    { id: 10, name: "受取利息", type: "収益" },
    { id: 11, name: "給料", type: "費用" },
    { id: 12, name: "家賃", type: "費用" },
    { id: 13, name: "水道光熱費", type: "費用" },
    { id: 14, name: "通信費", type: "費用" },
    { id: 15, name: "雑費", type: "費用" },
  ];
}

export default {
  query,
  getDefaultAccountItems,
};
