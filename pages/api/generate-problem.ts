import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { query } from "../../utils/db";
import {
  Problem,
  ResultSetHeader,
  AccountItem,
  JournalEntry,
} from "./api-types";

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 正解情報の型定義
interface CorrectAnswerData {
  explanation: string;
  journalEntries: JournalEntry[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // リクエストから難易度を取得（デフォルトは3）
    const { difficulty = 3, userId } = req.body;

    // OpenAI APIで簿記問題を生成
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `簿記${difficulty}級レベルの問題文と正解を作成してください。JSONフォーマットで以下の形式で返してください：
          {
            "title": "問題のタイトル（簡潔に）",
            "content": "問題文の詳細（取引の内容や条件をわかりやすく説明）",
            "relevantAccounts": ["勘定科目1", "勘定科目2", "勘定科目3", "勘定科目4", "勘定科目5"],
            "correctAnswer": {
              "explanation": "この問題の解説（なぜこの仕訳が正解なのか説明）",
              "journalEntries": [
                {
                  "debitAccount": "借方の勘定科目名",
                  "debitAmount": 金額（数値）,
                  "creditAccount": "貸方の勘定科目名",
                  "creditAmount": 金額（数値）
                }
              ]
            }
          }
          
          重要：
          1. 問題文の内容と正解の仕訳が完全に一致するようにしてください。
          2. 現金取引と掛け取引は明確に区別してください。問題文で「現金で支払った」と書かれているのに正解が「買掛金」になるなど、矛盾がないように注意してください。
          3. relevantAccountsは、この問題の解答や考察に関連する勘定科目を5つ厳選して含めてください。正解に必要な勘定科目は必須で、あとは似た性質を持つ勘定科目を含めてください。
          4. journalEntriesには複数の仕訳を含めることができます（複合仕訳の場合）。`,
        },
        {
          role: "user",
          content: `簿記${difficulty}級レベルの仕訳問題を1つ作成してください。JSONレスポンスで返してください。ある企業の経理担当者として日々の取引を記録する状況を想定した問題にしてください。また、この問題の正解仕訳と解説、関連する勘定科目も含めてください。`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("OpenAI APIからの応答が空です");
    }

    const generatedData = JSON.parse(content);

    // 正解データを抽出
    const correctAnswer = generatedData.correctAnswer || {
      explanation: "解説がありません",
      journalEntries: [],
    };

    // データベースに問題を保存
    let problemId;
    try {
      const result = await query(
        "INSERT INTO problems (title, content, difficulty, created_by) VALUES (?, ?, ?, ?)",
        [generatedData.title, generatedData.content, difficulty, userId || null]
      );

      // ResultSetHeaderに型キャスト
      const headerResult = result as ResultSetHeader;
      problemId = headerResult.insertId;

      // 正解仕訳をJSON形式で保存
      if (
        problemId &&
        correctAnswer.journalEntries &&
        correctAnswer.journalEntries.length > 0
      ) {
        await query(
          "INSERT INTO problem_answers (problem_id, answers, explanation) VALUES (?, ?, ?)",
          [
            problemId,
            JSON.stringify(correctAnswer.journalEntries),
            correctAnswer.explanation || "解説なし",
          ]
        );
      }

      // 関連する勘定科目が存在する場合、中間テーブルに保存
      if (
        generatedData.relevantAccounts &&
        Array.isArray(generatedData.relevantAccounts) &&
        problemId
      ) {
        // AIが選出した勘定科目名と一致するものをデータベースから検索
        const accountNames = generatedData.relevantAccounts;
        const accountsQuery = await query<AccountItem[]>(
          "SELECT id, name FROM account_items WHERE name IN (?)",
          [accountNames]
        );

        // 見つかった勘定科目を問題と紐付ける
        for (const account of accountsQuery) {
          await query(
            "INSERT INTO problem_accounts (problem_id, account_id) VALUES (?, ?)",
            [problemId, account.id]
          );
        }
      }
    } catch (dbError) {
      console.error("問題の保存に失敗しました:", dbError);
      // データベース操作が失敗した場合は一時的なIDを割り当て
      problemId = Math.floor(Math.random() * 1000) + 1000;
    }

    // 勘定科目の全リストを取得
    const allAccounts = await query<AccountItem[]>(
      "SELECT * FROM account_items ORDER BY id"
    );

    // 関連する勘定科目を抽出
    let relevantAccounts: AccountItem[] = [];
    if (
      generatedData.relevantAccounts &&
      Array.isArray(generatedData.relevantAccounts)
    ) {
      // AIが選出した勘定科目名と一致するものをフィルタリング
      const accountNames = generatedData.relevantAccounts;
      relevantAccounts = allAccounts.filter((account) =>
        accountNames.includes(account.name)
      );

      // 正解仕訳で使用される勘定科目も含める
      if (
        correctAnswer.journalEntries &&
        correctAnswer.journalEntries.length > 0
      ) {
        const correctAccountNames = new Set<string>();
        correctAnswer.journalEntries.forEach((entry: any) => {
          if (entry.debitAccount) correctAccountNames.add(entry.debitAccount);
          if (entry.creditAccount) correctAccountNames.add(entry.creditAccount);
        });

        // 正解で使われる勘定科目が関連科目に含まれていない場合は追加
        const correctAccounts = allAccounts.filter(
          (account) =>
            correctAccountNames.has(account.name) &&
            !relevantAccounts.some((ra) => ra.id === account.id)
        );
        relevantAccounts = [...relevantAccounts, ...correctAccounts];
      }

      // 5個に満たない場合は、ランダムに追加
      if (relevantAccounts.length < 5 && allAccounts.length > 0) {
        // すでに含まれていないアカウントをランダムに追加
        const remainingAccounts = allAccounts.filter(
          (account) => !relevantAccounts.some((ra) => ra.id === account.id)
        );

        // ランダムにシャッフル
        const shuffled = [...remainingAccounts].sort(() => 0.5 - Math.random());

        // 必要な数だけ追加
        const needed = 5 - relevantAccounts.length;
        relevantAccounts = [...relevantAccounts, ...shuffled.slice(0, needed)];
      }
    } else {
      // AIが勘定科目を返さなかった場合、デフォルトの勘定科目を使用
      relevantAccounts = [
        { id: 1, name: "現金", type: "資産" },
        { id: 3, name: "普通預金", type: "資産" },
        { id: 4, name: "売掛金", type: "資産" },
        { id: 8, name: "商品", type: "資産" },
        { id: 25, name: "買掛金", type: "負債" },
      ] as AccountItem[];
    }

    // レスポンスを返す
    const problemResponse = {
      id: problemId,
      title: generatedData.title,
      content: generatedData.content,
      difficulty: difficulty,
      created_at: new Date(),
      relevantAccounts: relevantAccounts,
      correctAnswer: {
        explanation: correctAnswer.explanation,
        correctAnswer: correctAnswer.journalEntries.map(
          (entry: any, index: number) => ({
            id: index + 1,
            ...entry,
          })
        ),
      },
    };

    res.status(200).json(problemResponse);
  } catch (error) {
    console.error("問題生成エラー:", error);
    res.status(500).json({ error: "問題の生成に失敗しました" });
  }
}
