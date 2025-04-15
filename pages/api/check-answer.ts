import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { query } from "../../utils/db";
import { Problem, UserAnswer, JournalEntry, CheckResult } from "./api-types";

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// テンプレートのインターフェイスを定義
interface AnswerTemplate {
  isMatch: (problem: Problem) => boolean;
  check: (problem: Problem, entries: JournalEntry[]) => CheckResult;
  correctAnswer?: (problem: Problem) => JournalEntry[];
}

// データベースから保存された正解情報の型
interface StoredAnswer {
  problem_id: number;
  answers: string; // JSON形式で保存された仕訳データ
  explanation: string;
}

// 回答テンプレート
const ANSWER_TEMPLATES: AnswerTemplate[] = [
  {
    isMatch: (problem: Problem): boolean => {
      const titleMatch =
        problem.title !== undefined &&
        (problem.title.includes("商品仕入") ||
          problem.title.includes("商品の仕入") ||
          problem.title.includes("仕入") ||
          problem.title.includes("購入") ||
          problem.title.includes("商品"));

      const contentMatch =
        problem.content !== undefined &&
        (problem.content.includes("商品仕入") ||
          problem.content.includes("商品を仕入") ||
          (problem.content.includes("商品") &&
            (problem.content.includes("仕入") ||
              problem.content.includes("購入"))));

      // 現金支払いの場合は特別処理
      const isCashPayment =
        problem.content !== undefined &&
        (problem.content.includes("現金で") ||
          problem.content.includes("現金払い") ||
          problem.content.includes("現金にて") ||
          problem.content.includes("現金を支払") ||
          problem.content.includes("即時に現金で"));

      // isCashPaymentが真の場合は、このテンプレートを使用しない（現金支払いテンプレートを使用）
      const result = Boolean(titleMatch || contentMatch) && !isCashPayment;
      return result;
    },
    check: (problem: Problem, entries: JournalEntry[]): CheckResult => {
      try {
        console.log("掛け取引の商品仕入テンプレートによるチェック開始", {
          problem,
        });

        // 問題文から仕入金額を抽出するパターンをいくつか試す
        let amount = 0;

        // パターン1: 円記号+数字+円
        const pattern1 = problem.content.match(/[¥￥](\d{1,3}(,\d{3})*|\d+)円/);
        if (pattern1) {
          amount = parseInt(pattern1[1].replace(/,/g, ""));
        }

        // パターン2: 数字+円
        if (amount === 0) {
          const pattern2 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)円/);
          if (pattern2) {
            amount = parseInt(pattern2[1].replace(/,/g, ""));
          }
        }

        // パターン3: 単に数字だけを探す
        if (amount === 0) {
          const pattern3 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)/);
          if (pattern3) {
            amount = parseInt(pattern3[1].replace(/,/g, ""));
          }
        }

        // 金額が見つからない場合はデフォルト値を使用
        if (amount === 0) {
          amount = 50000;
        }

        console.log("抽出された金額:", amount);

        // 正解となる仕訳（掛け取引）
        const correctEntry = {
          debitAccount: "商品",
          debitAmount: amount,
          creditAccount: "買掛金",
          creditAmount: amount,
        };

        console.log("正解仕訳（掛け取引）:", correctEntry);

        // 入力された仕訳をチェック
        let isCorrect = entries.some((entry) => {
          const debitAccountMatches =
            entry.debitAccount.trim().toLowerCase() ===
            correctEntry.debitAccount.trim().toLowerCase();
          const creditAccountMatches =
            entry.creditAccount.trim().toLowerCase() ===
            correctEntry.creditAccount.trim().toLowerCase();
          const amountsMatch =
            entry.debitAmount === entry.creditAmount && entry.debitAmount > 0;

          return debitAccountMatches && creditAccountMatches && amountsMatch;
        });

        // 解説文
        const explanation = isCorrect
          ? `正解です。商品仕入の仕訳では、${correctEntry.debitAccount}（借方）と${correctEntry.creditAccount}（貸方）を使います。`
          : `不正解です。商品の掛け仕入の正しい仕訳は、${correctEntry.debitAccount}（借方）と${correctEntry.creditAccount}（貸方）です。金額は両方とも${amount}円です。`;

        return {
          isCorrect,
          explanation,
          correctAnswer: [
            {
              id: 1,
              ...correctEntry,
            },
          ],
        };
      } catch (error) {
        console.error("商品仕入（掛け取引）テンプレートでエラー発生:", error);
        // エラー時のフォールバック
        return {
          isCorrect: false,
          explanation:
            "商品仕入（掛け取引）の仕訳評価中にエラーが発生しました。商品仕入の基本的な仕訳は「商品」を借方、「買掛金」を貸方に記録します。",
          correctAnswer: [
            {
              id: 1,
              debitAccount: "商品",
              debitAmount: 50000,
              creditAccount: "買掛金",
              creditAmount: 50000,
            },
          ],
        };
      }
    },
  },
  {
    isMatch: (problem: Problem): boolean => {
      const titleMatch =
        problem.title !== undefined &&
        (problem.title.includes("商品仕入") ||
          problem.title.includes("商品の仕入") ||
          problem.title.includes("仕入") ||
          problem.title.includes("購入") ||
          problem.title.includes("商品"));

      const contentMatch =
        problem.content !== undefined &&
        (problem.content.includes("商品仕入") ||
          problem.content.includes("商品を仕入") ||
          (problem.content.includes("商品") &&
            (problem.content.includes("仕入") ||
              problem.content.includes("購入"))));

      // 現金支払いの場合
      const isCashPayment =
        problem.content !== undefined &&
        (problem.content.includes("現金で") ||
          problem.content.includes("現金払い") ||
          problem.content.includes("現金にて") ||
          problem.content.includes("現金を支払") ||
          problem.content.includes("即時に現金で"));

      return (titleMatch || contentMatch) && isCashPayment;
    },
    check: (problem: Problem, entries: JournalEntry[]): CheckResult => {
      try {
        console.log("商品仕入（現金払い）テンプレートによるチェック開始", {
          problem,
        });

        // 問題文から仕入金額を抽出するパターンをいくつか試す
        let amount = 0;

        // パターン1: 円記号+数字+円
        const pattern1 = problem.content.match(/[¥￥](\d{1,3}(,\d{3})*|\d+)円/);
        if (pattern1) {
          amount = parseInt(pattern1[1].replace(/,/g, ""));
        }

        // パターン2: 数字+円
        if (amount === 0) {
          const pattern2 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)円/);
          if (pattern2) {
            amount = parseInt(pattern2[1].replace(/,/g, ""));
          }
        }

        // パターン3: 単に数字だけを探す
        if (amount === 0) {
          const pattern3 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)/);
          if (pattern3) {
            amount = parseInt(pattern3[1].replace(/,/g, ""));
          }
        }

        // 金額が見つからない場合はデフォルト値を使用
        if (amount === 0) {
          amount = 50000;
        }

        console.log("抽出された金額:", amount);

        // 正解となる仕訳（現金払いの場合）
        const correctEntry = {
          debitAccount: "商品",
          debitAmount: amount,
          creditAccount: "現金",
          creditAmount: amount,
        };

        console.log("正解仕訳（現金払い）:", correctEntry);

        // 入力された仕訳をチェック
        let isCorrect = entries.some((entry) => {
          const debitAccountMatches =
            entry.debitAccount.trim().toLowerCase() ===
            correctEntry.debitAccount.trim().toLowerCase();
          const creditAccountMatches =
            entry.creditAccount.trim().toLowerCase() ===
            correctEntry.creditAccount.trim().toLowerCase();
          const amountsMatch =
            entry.debitAmount === entry.creditAmount && entry.debitAmount > 0;

          return debitAccountMatches && creditAccountMatches && amountsMatch;
        });

        // 解説文
        const explanation = isCorrect
          ? `正解です。商品仕入（現金払い）の仕訳では、${correctEntry.debitAccount}（借方）と${correctEntry.creditAccount}（貸方）を使います。`
          : `不正解です。商品仕入を現金で支払った場合の正しい仕訳は、${correctEntry.debitAccount}（借方）と${correctEntry.creditAccount}（貸方）です。金額は両方とも${amount}円です。`;

        return {
          isCorrect,
          explanation,
          correctAnswer: [
            {
              id: 1,
              ...correctEntry,
            },
          ],
        };
      } catch (error) {
        console.error("商品仕入（現金払い）テンプレートでエラー発生:", error);
        // エラー時のフォールバック
        return {
          isCorrect: false,
          explanation:
            "商品仕入（現金払い）の仕訳評価中にエラーが発生しました。商品仕入を現金で支払った場合の基本的な仕訳は「商品」を借方、「現金」を貸方に記録します。",
          correctAnswer: [
            {
              id: 1,
              debitAccount: "商品",
              debitAmount: 50000,
              creditAccount: "現金",
              creditAmount: 50000,
            },
          ],
        };
      }
    },
    correctAnswer: (problem: Problem): JournalEntry[] => {
      // 金額抽出
      let amount = 0;
      const pattern = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)円/);
      if (pattern) {
        amount = parseInt(pattern[1].replace(/,/g, ""));
      } else {
        amount = 50000; // デフォルト値
      }

      return [
        {
          id: 1,
          debitAccount: "商品",
          debitAmount: amount,
          creditAccount: "現金",
          creditAmount: amount,
        },
      ];
    },
  },
  {
    isMatch: (problem: Problem): boolean => {
      const titleMatch =
        problem.title !== undefined &&
        (problem.title.includes("商品仕入") ||
          problem.title.includes("商品の仕入") ||
          problem.title.includes("仕入") ||
          problem.title.includes("購入") ||
          problem.title.includes("商品"));

      const contentMatch =
        problem.content !== undefined &&
        (problem.content.includes("商品仕入") ||
          problem.content.includes("商品を仕入") ||
          (problem.content.includes("商品") &&
            (problem.content.includes("仕入") ||
              problem.content.includes("購入"))));

      const result = Boolean(titleMatch || contentMatch);
      return result;
    },
    check: (problem: Problem, entries: JournalEntry[]): CheckResult => {
      try {
        console.log("商品仕入テンプレートによるチェック開始", { problem });

        // 問題文から仕入金額を抽出するパターンをいくつか試す
        let amount = 0;

        // パターン1: 円記号+数字+円
        const pattern1 = problem.content.match(/[¥￥](\d{1,3}(,\d{3})*|\d+)円/);
        if (pattern1) {
          amount = parseInt(pattern1[1].replace(/,/g, ""));
        }

        // パターン2: 数字+円
        if (amount === 0) {
          const pattern2 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)円/);
          if (pattern2) {
            amount = parseInt(pattern2[1].replace(/,/g, ""));
          }
        }

        // パターン3: 単に数字だけを探す
        if (amount === 0) {
          const pattern3 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)/);
          if (pattern3) {
            amount = parseInt(pattern3[1].replace(/,/g, ""));
          }
        }

        // 金額が見つからない場合はデフォルト値を使用
        if (amount === 0) {
          amount = 50000;
        }

        console.log("抽出された金額:", amount);

        // 正解となる仕訳
        const correctEntry = {
          debitAccount: "商品",
          debitAmount: amount,
          creditAccount: "買掛金",
          creditAmount: amount,
        };

        console.log("正解仕訳:", correctEntry);

        // 入力された仕訳をチェック
        let isCorrect = entries.some((entry) => {
          const debitAccountMatches =
            entry.debitAccount.trim().toLowerCase() ===
            correctEntry.debitAccount.trim().toLowerCase();
          const creditAccountMatches =
            entry.creditAccount.trim().toLowerCase() ===
            correctEntry.creditAccount.trim().toLowerCase();
          const amountsMatch =
            entry.debitAmount === entry.creditAmount && entry.debitAmount > 0;

          return debitAccountMatches && creditAccountMatches && amountsMatch;
        });

        // 解説文
        const explanation = isCorrect
          ? `正解です。商品仕入の仕訳では、${correctEntry.debitAccount}（借方）と${correctEntry.creditAccount}（貸方）を使います。`
          : `不正解です。商品仕入の正しい仕訳は、${correctEntry.debitAccount}（借方）と${correctEntry.creditAccount}（貸方）です。金額は両方とも${amount}円です。`;

        return {
          isCorrect,
          explanation,
          correctAnswer: [
            {
              id: 1,
              ...correctEntry,
            },
          ],
        };
      } catch (error) {
        console.error("商品仕入テンプレートでエラー発生:", error);
        // エラー時のフォールバック
        return {
          isCorrect: false,
          explanation:
            "商品仕入の仕訳評価中にエラーが発生しました。商品仕入の基本的な仕訳は「商品」を借方、「買掛金」を貸方に記録します。",
          correctAnswer: [
            {
              id: 1,
              debitAccount: "商品",
              debitAmount: 50000,
              creditAccount: "買掛金",
              creditAmount: 50000,
            },
          ],
        };
      }
    },
  },
  {
    isMatch: (problem: Problem): boolean => {
      const titleMatch =
        problem.title !== undefined &&
        (problem.title.includes("商品販売") ||
          problem.title.includes("商品の販売") ||
          problem.title.includes("販売") ||
          problem.title.includes("売上"));

      const contentMatch =
        problem.content !== undefined &&
        (problem.content.includes("商品販売") ||
          problem.content.includes("商品の販売") ||
          problem.content.includes("販売") ||
          problem.content.includes("売上") ||
          problem.content.includes("売り上げ") ||
          problem.content.includes("商品を売"));

      return Boolean(titleMatch || contentMatch);
    },
    check: (problem: Problem, entries: JournalEntry[]): CheckResult => {
      try {
        console.log("商品販売テンプレートによるチェック開始", { problem });

        // 問題文から販売金額を抽出するパターンをいくつか試す
        let amount = 0;

        // パターン1: 円記号+数字+円
        const pattern1 = problem.content.match(/[¥￥](\d{1,3}(,\d{3})*|\d+)円/);
        if (pattern1) {
          amount = parseInt(pattern1[1].replace(/,/g, ""));
          console.log("パターン1で金額検出:", amount);
        }

        // パターン2: 数字+円
        if (amount === 0) {
          const pattern2 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)円/);
          if (pattern2) {
            amount = parseInt(pattern2[1].replace(/,/g, ""));
            console.log("パターン2で金額検出:", amount);
          }
        }

        // パターン3: 単に数字だけを探す
        if (amount === 0) {
          const pattern3 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)/);
          if (pattern3) {
            amount = parseInt(pattern3[1].replace(/,/g, ""));
            console.log("パターン3で金額検出:", amount);
          }
        }

        // 金額が見つからない場合はデフォルト値を使用
        if (amount === 0) {
          amount = 50000;
          console.log("金額が検出できなかったためデフォルト値を使用:", amount);
        }

        // 消費税額の計算（10%）
        const taxRate = 0.1;
        const taxAmount = Math.floor(amount * taxRate);
        const saleAmount = amount - taxAmount;

        console.log("消費税額:", taxAmount);
        console.log("売上金額:", saleAmount);

        // 正解となる仕訳
        const correctEntries = [
          {
            id: 1,
            debitAccount: "現金",
            debitAmount: amount,
            creditAccount: "売上",
            creditAmount: saleAmount,
          },
          {
            id: 2,
            debitAccount: "",
            debitAmount: 0,
            creditAccount: "仮受消費税",
            creditAmount: taxAmount,
          },
        ];

        console.log("正解仕訳:", correctEntries);

        // 少なくとも2つのエントリが必要
        if (entries.length < 2) {
          return {
            isCorrect: false,
            explanation: `不正解です。商品販売の仕訳には、少なくとも2つのエントリが必要です。現金（借方）、売上と仮受消費税（貸方）を記録してください。`,
            correctAnswer: correctEntries,
          };
        }

        // 必須のアカウントが存在するか確認
        const hasDebitCash = entries.some(
          (entry) => entry.debitAccount.trim().toLowerCase() === "現金"
        );

        const hasCreditSales = entries.some(
          (entry) => entry.creditAccount.trim().toLowerCase() === "売上"
        );

        const hasCreditTax = entries.some(
          (entry) => entry.creditAccount.trim().toLowerCase() === "仮受消費税"
        );

        const isCorrect = hasDebitCash && hasCreditSales && hasCreditTax;

        // 解説文
        let explanation;
        if (isCorrect) {
          explanation = `正解です。商品販売の仕訳では、現金（借方）、売上と仮受消費税（貸方）を記録します。商品を${amount}円で販売した場合、売上は${saleAmount}円、消費税は${taxAmount}円となります。`;
        } else {
          explanation = `不正解です。商品販売の正しい仕訳は、現金（借方）を${amount}円、売上（貸方）を${saleAmount}円、仮受消費税（貸方）を${taxAmount}円とします。`;
        }

        return {
          isCorrect,
          explanation,
          correctAnswer: correctEntries,
        };
      } catch (error) {
        console.error("商品販売テンプレートでエラー発生:", error);
        // エラー時のフォールバック
        return {
          isCorrect: false,
          explanation:
            "商品販売の仕訳評価中にエラーが発生しました。商品販売の基本的な仕訳は「現金」を借方、「売上」と「仮受消費税」を貸方に記録します。",
          correctAnswer: [
            {
              id: 1,
              debitAccount: "現金",
              debitAmount: 55000,
              creditAccount: "売上",
              creditAmount: 50000,
            },
            {
              id: 2,
              debitAccount: "",
              debitAmount: 0,
              creditAccount: "仮受消費税",
              creditAmount: 5000,
            },
          ],
        };
      }
    },
    correctAnswer: (problem: Problem): JournalEntry[] => {
      // 問題文から金額を抽出するパターンをいくつか試す
      let amount = 0;

      // パターン1: 円記号+数字+円
      const pattern1 = problem.content.match(/[¥￥](\d{1,3}(,\d{3})*|\d+)円/);
      if (pattern1) {
        amount = parseInt(pattern1[1].replace(/,/g, ""));
      }

      // パターン2: 数字+円
      if (amount === 0) {
        const pattern2 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)円/);
        if (pattern2) {
          amount = parseInt(pattern2[1].replace(/,/g, ""));
        }
      }

      // パターン3: 単に数字だけを探す
      if (amount === 0) {
        const pattern3 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)/);
        if (pattern3) {
          amount = parseInt(pattern3[1].replace(/,/g, ""));
        }
      }

      // 金額が見つからない場合はデフォルト値を使用
      if (amount === 0) {
        amount = 50000;
      }

      // 消費税額の計算（10%）
      const taxRate = 0.1;
      const taxAmount = Math.floor(amount * taxRate);
      const saleAmount = amount - taxAmount;

      return [
        {
          id: 1,
          debitAccount: "現金",
          debitAmount: amount,
          creditAccount: "売上",
          creditAmount: saleAmount,
        },
        {
          id: 2,
          debitAccount: "",
          debitAmount: 0,
          creditAccount: "仮受消費税",
          creditAmount: taxAmount,
        },
      ];
    },
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    problemId,
    journalEntries,
    isLearningMode: requestedLearningMode,
    gaveUp,
  } = req.body as UserAnswer & { isLearningMode?: boolean; gaveUp?: boolean };

  // デバッグ情報
  console.log("リクエスト情報:", {
    problemId,
    isLearningMode: requestedLearningMode,
    gaveUp,
    journalEntries: journalEntries.length,
  });

  try {
    // 問題の詳細をデータベースから取得
    let problem: Problem | null = null;
    try {
      const problems = (await query("SELECT * FROM problems WHERE id = ?", [
        problemId,
      ])) as Problem[];
      if (Array.isArray(problems) && problems.length > 0) {
        problem = problems[0];
        console.log("問題取得成功:", { id: problem.id, title: problem.title });
      }
    } catch (dbError) {
      console.error("問題の取得に失敗しました:", dbError);
      return res.status(500).json({ error: "問題の取得に失敗しました" });
    }

    if (!problem) {
      console.error("問題が見つかりません。ID:", problemId);
      return res.status(404).json({ error: "問題が見つかりませんでした" });
    }

    // 回答が空かどうかをチェック
    const isEmptyAnswer =
      journalEntries.length === 1 &&
      !journalEntries[0].debitAccount &&
      !journalEntries[0].creditAccount &&
      (!journalEntries[0].debitAmount || journalEntries[0].debitAmount === 0) &&
      (!journalEntries[0].creditAmount || journalEntries[0].creditAmount === 0);

    // 学習モードの確認（明示的に指定または空の回答＋ギブアップ）
    const isLearningMode =
      !!requestedLearningMode || (isEmptyAnswer && gaveUp === true);

    console.log(
      "学習モード:",
      isLearningMode,
      "空回答:",
      isEmptyAnswer,
      "ギブアップ:",
      gaveUp
    );

    // 空の回答で学習モードでない場合は、明確な不正解として扱う
    if (isEmptyAnswer && !isLearningMode) {
      return res.status(200).json({
        isCorrect: false,
        explanation: "解答が入力されていません。仕訳を入力してください。",
        correctAnswer: [],
      });
    }

    // データベースから保存された正解情報を取得
    let storedAnswer: StoredAnswer | null = null;
    try {
      const storedAnswers = await query(
        "SELECT * FROM problem_answers WHERE problem_id = ?",
        [problemId]
      );

      if (Array.isArray(storedAnswers) && storedAnswers.length > 0) {
        storedAnswer = storedAnswers[0] as StoredAnswer;
        console.log("保存された正解情報を取得しました");
      }
    } catch (dbError) {
      console.error("正解情報の取得に失敗しました:", dbError);
    }

    // 保存された正解情報がある場合はそれを使用
    if (storedAnswer) {
      let parsedAnswers: JournalEntry[] = [];
      try {
        parsedAnswers = JSON.parse(storedAnswer.answers);

        // IDが欠けている場合は追加
        parsedAnswers = parsedAnswers.map((entry, index) => ({
          id: entry.id || index + 1,
          debitAccount: entry.debitAccount || "",
          debitAmount: entry.debitAmount || 0,
          creditAccount: entry.creditAccount || "",
          creditAmount: entry.creditAmount || 0,
        }));

        console.log("正解情報を解析しました:", parsedAnswers);

        // 学習モードまたはギブアップの場合は正解を表示
        if (isLearningMode || (journalEntries.length === 0 && gaveUp)) {
          return res.status(200).json({
            isCorrect: false,
            explanation: storedAnswer.explanation || "正解例を表示します。",
            correctAnswer: parsedAnswers,
          });
        }

        // 通常モードの場合は回答をチェック
        // 一致判定のロジック（簡略化のため厳密な比較）
        let isCorrect = journalEntries.length === parsedAnswers.length;

        if (isCorrect) {
          // 各項目を比較（順序は考慮せず、内容の一致を確認）
          const normalizedUserEntries = journalEntries.map((entry) => ({
            debitAccount: (entry.debitAccount || "").trim().toLowerCase(),
            debitAmount: Number(entry.debitAmount) || 0,
            creditAccount: (entry.creditAccount || "").trim().toLowerCase(),
            creditAmount: Number(entry.creditAmount) || 0,
          }));

          const normalizedCorrectEntries = parsedAnswers.map((entry) => ({
            debitAccount: (entry.debitAccount || "").trim().toLowerCase(),
            debitAmount: Number(entry.debitAmount) || 0,
            creditAccount: (entry.creditAccount || "").trim().toLowerCase(),
            creditAmount: Number(entry.creditAmount) || 0,
          }));

          // すべてのユーザーエントリが正解に含まれていることを確認
          isCorrect = normalizedUserEntries.every((userEntry) => {
            return normalizedCorrectEntries.some(
              (correctEntry) =>
                userEntry.debitAccount === correctEntry.debitAccount &&
                userEntry.creditAccount === correctEntry.creditAccount &&
                userEntry.debitAmount === correctEntry.debitAmount &&
                userEntry.creditAmount === correctEntry.creditAmount
            );
          });
        }

        return res.status(200).json({
          isCorrect,
          explanation: isCorrect
            ? "正解です！正しい仕訳が記帳されています。"
            : storedAnswer.explanation ||
              "不正解です。正しい仕訳を確認してください。",
          correctAnswer: isCorrect ? [] : parsedAnswers,
        });
      } catch (parseError) {
        console.error("保存されたデータの解析に失敗しました:", parseError);
        // 解析エラーの場合はテンプレートベースの処理に進む
      }
    }

    // 保存された正解情報がない場合、またはエラーが発生した場合は
    // テンプレートを使用して回答をチェック
    console.log("テンプレートマッチング開始");
    const template = findMatchingTemplate(problem);
    let result: CheckResult;

    if (template) {
      console.log(`テンプレートが見つかりました`);

      // テンプレートが見つかった場合
      if (isLearningMode || (journalEntries.length === 0 && gaveUp)) {
        console.log("学習モード: 正解を表示");

        if (
          "correctAnswer" in template &&
          typeof template.correctAnswer === "function"
        ) {
          result = {
            isCorrect: false,
            explanation: `正解例: 以下の仕訳が基本的な正解です。`,
            correctAnswer: template.correctAnswer(problem),
          };
        } else {
          // correctAnswer関数がない場合のデフォルト
          result = {
            isCorrect: false,
            explanation: "問題の正解例です。",
            correctAnswer: [
              {
                id: 1,
                debitAccount: "（適切な勘定科目）",
                debitAmount: 10000,
                creditAccount: "（適切な勘定科目）",
                creditAmount: 10000,
              },
            ],
          };
        }
      } else {
        // 通常のチェック
        result = template.check(problem, journalEntries);
      }
    } else {
      console.log(
        "マッチするテンプレートが見つかりませんでした。フォールバック処理を実行"
      );

      // テンプレートが見つからない場合のフォールバック処理
      if (isLearningMode || (journalEntries.length === 0 && gaveUp)) {
        console.log("学習モード: フォールバックの正解を表示");
        // 問題から基本的なパターンを推測して正解例を提供する
        let defaultCorrectAnswer = generateDefaultCorrectAnswer(problem);

        result = {
          isCorrect: false,
          explanation:
            "問題パターンが認識できませんでしたが、以下は一般的な仕訳の正解例です。",
          correctAnswer: defaultCorrectAnswer,
        };
      } else {
        // OpenAI APIを使用して評価を試みる（既存のコード流用）
        try {
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          console.log("OpenAIによる評価を開始");

          const userEntries = journalEntries.map((entry) => ({
            借方: entry.debitAccount,
            借方金額: entry.debitAmount,
            貸方: entry.creditAccount,
            貸方金額: entry.creditAmount,
          }));

          const prompt = `
あなたは簿記の専門家です。以下の問題と解答を評価してください。

【問題】
${problem.title}
${problem.content}

【ユーザーの解答】
${JSON.stringify(userEntries, null, 2)}

この解答が正しいかどうか判断し、以下の形式で回答してください。
- 正誤判定（true/false）
- 解説文（なぜ正解または不正解なのか、簡潔な説明）
- 正解例（正しい仕訳の例）
`;

          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 500,
          });

          const content = response.choices[0]?.message?.content || "";
          console.log("OpenAI応答:", content);

          // AIの回答から正誤判定、解説、正解例を抽出
          const isCorrectMatch = content.match(/(true|false)/i);
          const isCorrect = isCorrectMatch
            ? isCorrectMatch[0].toLowerCase() === "true"
            : false;

          // 解説部分を抽出
          let explanation = "AIが評価を提供できませんでした。";
          if (content.includes("解説")) {
            const parts = content.split("解説");
            if (parts.length > 1) {
              explanation = parts[1].split("\n")[0].trim();
              if (!explanation) {
                // 解説が空の場合は次の行を試す
                explanation =
                  parts[1].split("\n")[1]?.trim() ||
                  "解説は提供されませんでした。";
              }
            }
          }

          result = {
            isCorrect,
            explanation,
            correctAnswer: generateDefaultCorrectAnswer(problem),
          };
        } catch (aiError) {
          console.error("OpenAI API呼び出しエラー:", aiError);
          // AIエラー時のフォールバック
          result = {
            isCorrect: false,
            explanation:
              "評価システムでエラーが発生しました。基本的な仕訳例を参照してください。",
            correctAnswer: generateDefaultCorrectAnswer(problem),
          };
        }
      }
    }

    // 回答をクライアントに返す
    return res.status(200).json(result);
  } catch (error) {
    console.error("エラーが発生しました:", error);
    return res.status(500).json({
      isCorrect: false,
      explanation:
        "サーバーエラーが発生しました。しばらくしてからもう一度お試しください。",
      correctAnswer: [],
    });
  }
}

// フォールバック用の正解生成関数
function generateDefaultCorrectAnswer(problem: Problem): JournalEntry[] {
  console.log("デフォルト正解生成開始:", problem.title);

  // 問題文から金額を抽出するパターンをいくつか試す
  let amount = 0;

  // パターン1: 円記号+数字+円
  const pattern1 = problem.content.match(/[¥￥](\d{1,3}(,\d{3})*|\d+)円/);
  if (pattern1) {
    amount = parseInt(pattern1[1].replace(/,/g, ""));
  }

  // パターン2: 数字+円
  if (amount === 0) {
    const pattern2 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)円/);
    if (pattern2) {
      amount = parseInt(pattern2[1].replace(/,/g, ""));
    }
  }

  // パターン3: 単に数字だけを探す
  if (amount === 0) {
    const pattern3 = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)/);
    if (pattern3) {
      amount = parseInt(pattern3[1].replace(/,/g, ""));
    }
  }

  // 金額が見つからない場合はデフォルト値を使用
  if (amount === 0) {
    amount = 50000;
  }

  // 問題のタイトルと内容から一般的なパターンを推測
  if (
    problem.title !== undefined &&
    (problem.title.includes("販売") ||
      (problem.content !== undefined && problem.content.includes("販売")) ||
      problem.title.includes("売上") ||
      (problem.content !== undefined && problem.content.includes("売上")))
  ) {
    return [
      {
        id: 1,
        debitAccount: "売掛金",
        debitAmount: amount,
        creditAccount: "売上",
        creditAmount: amount,
      },
    ];
  } else if (
    problem.title !== undefined &&
    (problem.title.includes("仕入") ||
      (problem.content !== undefined && problem.content.includes("仕入")) ||
      problem.title.includes("購入") ||
      (problem.content !== undefined && problem.content.includes("購入")))
  ) {
    return [
      {
        id: 1,
        debitAccount: "商品",
        debitAmount: amount,
        creditAccount: "買掛金",
        creditAmount: amount,
      },
    ];
  } else if (
    problem.title !== undefined &&
    (problem.title.includes("固定資産") ||
      (problem.content !== undefined && problem.content.includes("固定資産")) ||
      problem.title.includes("設備") ||
      (problem.content !== undefined && problem.content.includes("設備")))
  ) {
    return [
      {
        id: 1,
        debitAccount: "器具備品",
        debitAmount: amount,
        creditAccount: "現金",
        creditAmount: amount,
      },
    ];
  } else if (
    problem.title !== undefined &&
    (problem.title.includes("家賃") ||
      (problem.content !== undefined && problem.content.includes("家賃")) ||
      problem.title.includes("支払") ||
      (problem.content !== undefined && problem.content.includes("支払")))
  ) {
    return [
      {
        id: 1,
        debitAccount: "家賃",
        debitAmount: amount,
        creditAccount: "現金",
        creditAmount: amount,
      },
    ];
  } else {
    // 完全に不明な場合のデフォルト
    return [
      {
        id: 1,
        debitAccount: "（適切な勘定科目）",
        debitAmount: amount,
        creditAccount: "（適切な勘定科目）",
        creditAmount: amount,
      },
    ];
  }
}

// テンプレートを見つける関数
function findMatchingTemplate(problem: Problem): AnswerTemplate | null {
  const template = ANSWER_TEMPLATES.find((template) =>
    template.isMatch(problem)
  );
  return template || null;
}
