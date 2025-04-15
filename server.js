const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

// 環境変数の読み込み
dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json());

// データベース接続プール
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// APIルート

// 勘定科目一覧取得API
app.get("/api/account-items", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM account_items ORDER BY display_order"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching account items:", error);
    res.status(500).json({ error: "データベースエラーが発生しました。" });
  }
});

// 問題生成API
app.post("/api/generate-problem", async (req, res) => {
  try {
    // OpenAIを使用して問題を生成する処理は後で実装
    res.json({
      id: 1,
      title: "商品の仕入れと売上の記帳",
      content:
        "次の取引について仕訳しなさい。1月15日：商品¥50,000を掛けで仕入れた。1月20日：上記商品¥70,000を掛けで販売した。",
    });
  } catch (error) {
    console.error("Error generating problem:", error);
    res.status(500).json({ error: "問題生成中にエラーが発生しました。" });
  }
});

// 回答チェックAPI
app.post("/api/check-answer", async (req, res) => {
  try {
    // OpenAIを使用して回答をチェックする処理は後で実装
    res.json({
      isCorrect: true,
      explanation: "正しい仕訳です。売上は収益勘定であり、貸方に記入します。",
      correctAnswer: [
        { id: 1, debit: "商品", credit: "買掛金", amount: 50000 },
        { id: 2, debit: "売掛金", credit: "売上", amount: 70000 },
      ],
    });
  } catch (error) {
    console.error("Error checking answer:", error);
    res.status(500).json({ error: "回答チェック中にエラーが発生しました。" });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
