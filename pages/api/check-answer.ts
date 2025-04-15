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

        // 正解となる仕訳（掛け取引）- 三分法で「仕入」勘定を使用
        const correctEntry = {
          debitAccount: "仕入",
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
          ? `正解です。日商簿記検定の仕訳法（三分法）では、商品仕入の仕訳は、${correctEntry.debitAccount}（借方）と${correctEntry.creditAccount}（貸方）を使います。`
          : `不正解です。日商簿記検定の仕訳法（三分法）では、商品の掛け仕入の正しい仕訳は、${correctEntry.debitAccount}（借方）と${correctEntry.creditAccount}（貸方）です。金額は両方とも${amount}円です。`;

        return {
          isCorrect,
          explanation,
          correctAnswer: [
            {
              id: 1,
              ...correctEntry,
              note: "日商簿記検定では三分法を採用しており、商品の仕入れには「仕入」勘定科目を使用します。"
            },
          ],
        };
      } catch (error) {
        console.error("商品仕入（掛け取引）テンプレートでエラー発生:", error);
        // エラー時のフォールバック
        return {
          isCorrect: false,
          explanation:
            "商品仕入（掛け取引）の仕訳評価中にエラーが発生しました。日商簿記検定の三分法では、商品仕入の基本的な仕訳は「仕入」を借方、「買掛金」を貸方に記録します。",
          correctAnswer: [
            {
              id: 1,
              debitAccount: "仕入",
              debitAmount: 50000,
              creditAccount: "買掛金",
              creditAmount: 50000,
              note: "日商簿記検定では三分法を採用しており、商品の仕入れには「仕入」勘定科目を使用します。"
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

        // 正解となる仕訳（現金払いの場合）- 三分法で「仕入」勘定を使用
        const correctEntry = {
          debitAccount: "仕入",
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
          ? `正解です。日商簿記検定の仕訳法（三分法）では、商品仕入（現金払い）の仕訳は、${correctEntry.debitAccount}（借方）と${correctEntry.creditAccount}（貸方）を使います。`
          : `不正解です。日商簿記検定の仕訳法（三分法）では、商品仕入を現金で支払った場合の正しい仕訳は、${correctEntry.debitAccount}（借方）と${correctEntry.creditAccount}（貸方）です。金額は両方とも${amount}円です。`;

        return {
          isCorrect,
          explanation,
          correctAnswer: [
            {
              id: 1,
              ...correctEntry,
              note: "日商簿記検定では三分法を採用しており、商品の仕入れには「仕入」勘定科目を使用します。"
            },
          ],
        };
      } catch (error) {
        console.error("商品仕入（現金払い）テンプレートでエラー発生:", error);
        // エラー時のフォールバック
        return {
          isCorrect: false,
          explanation:
            "商品仕入（現金払い）の仕訳評価中にエラーが発生しました。日商簿記検定の三分法では、商品仕入を現金で支払った場合の基本的な仕訳は「仕入」を借方、「現金」を貸方に記録します。",
          correctAnswer: [
            {
              id: 1,
              debitAccount: "仕入",
              debitAmount: 50000,
              creditAccount: "現金",
              creditAmount: 50000,
              note: "日商簿記検定では三分法を採用しており、商品の仕入れには「仕入」勘定科目を使用します。"
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
          debitAccount: "仕入",
          debitAmount: amount,
          creditAccount: "現金",
          creditAmount: amount,
          note: "日商簿記検定では三分法を採用しており、商品の仕入れには「仕入」勘定科目を使用します。"
        },
      ];
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

  try {
    const { problem, userAnswers } = req.body;

    if (!problem) {
      return res.status(400).json({
        error: "問題データが必要です",
      });
    }

    // userAnswersが提供されていない場合や空配列の場合は正解のみを要求していると判断
    const isCorrectAnswerOnly = !userAnswers || 
                             !Array.isArray(userAnswers) || 
                             userAnswers.length === 0 ||
                             (userAnswers.length === 1 && 
                              !userAnswers[0].debitAccount && 
                              !userAnswers[0].creditAccount);

    console.log("回答チェックAPI呼び出し:", {
      problem: problem,
      userAnswers: userAnswers,
      isCorrectAnswerOnly: isCorrectAnswerOnly
    });

    // 正解情報のみを要求している場合
    if (isCorrectAnswerOnly) {
      console.log("正解のみの要求と判断します");
      
      // 問題タイトルや内容から商品仕入に関する問題か判断
      const isItemPurchase = problem.title && (
        problem.title.includes("仕入") || 
        problem.title.includes("商品") && problem.title.includes("購入")
      ) || problem.content && (
        problem.content.includes("仕入") || 
        (problem.content.includes("商品") && problem.content.includes("購入"))
      );
      
      if (isItemPurchase) {
        // 商品仕入に関する問題の場合
        let amount = 50000; // デフォルト金額
        
        // 問題文から金額を抽出
        if (problem.content) {
          const match = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)円/);
          if (match) {
            amount = parseInt(match[1].replace(/,/g, ""));
          }
        }
        
        // 掛け取引かどうか判断
        const isCreditPurchase = problem.content && (
          problem.content.includes("掛け") || 
          problem.content.includes("掛で") ||
          problem.content.includes("後日支払")
        );
        
        if (isCreditPurchase) {
          // 掛け仕入の場合
          return res.status(200).json({
            isCorrect: false,
            explanation: "日商簿記検定の三分法では、商品を掛けで仕入れた場合、「仕入」という費用勘定科目を借方に記入し、「買掛金」を貸方に記入します。",
            correctAnswer: [
              {
                id: 1,
                debitAccount: "仕入",
                debitAmount: amount,
                creditAccount: "買掛金",
                creditAmount: amount,
                note: "日商簿記検定では三分法を採用しており、商品の仕入れには「仕入」勘定科目を使用します。"
              }
            ]
          });
        } else {
          // 現金仕入の場合
          return res.status(200).json({
            isCorrect: false,
            explanation: "日商簿記検定の三分法では、商品を現金で仕入れた場合、「仕入」という費用勘定科目を借方に記入し、「現金」を貸方に記入します。",
            correctAnswer: [
              {
                id: 1,
                debitAccount: "仕入",
                debitAmount: amount,
                creditAccount: "現金",
                creditAmount: amount,
                note: "日商簿記検定では三分法を採用しており、商品の仕入れには「仕入」勘定科目を使用します。"
              }
            ]
          });
        }
      }
      
      // AIで正解を生成
      try {
        return await generateCorrectAnswerWithAI(problem, res);
      } catch (aiError) {
        console.error("AI正解生成エラー:", aiError);
        // 汎用的なデフォルト回答
        return res.status(200).json({
          isCorrect: false,
          explanation: "この問題の解説です。取引の内容に応じて適切な勘定科目を選択してください。",
          correctAnswer: [
            {
              id: 1,
              debitAccount: "適切な勘定科目",
              debitAmount: 50000,
              creditAccount: "適切な勘定科目",
              creditAmount: 50000,
              note: "問題の内容に応じて適切な勘定科目を選択してください。"
            }
          ]
        });
      }
    }

    // ここから下は実際の回答チェック処理...
    // ... 既存コードはそのまま維持 ...
    
    // 以下は既存コードをそのまま維持
    if (!Array.isArray(userAnswers)) {
      return res.status(400).json({
        error: "有効な回答データが必要です",
      });
    }

    console.log("回答チェックAPI呼び出し:", {
      problem: problem,
      userAnswers: userAnswers,
    });

    // 1. データベースに保存された正解情報があるか確認
    let storedAnswer: StoredAnswer | null = null;
    try {
      if (problem.id) {
        const results = await query<StoredAnswer[]>(
          "SELECT * FROM problem_answers WHERE problem_id = ?",
          [problem.id]
        );
        if (results && results.length > 0) {
          storedAnswer = results[0];
        }
      }
    } catch (dbError) {
      console.error("正解情報の取得に失敗:", dbError);
      // エラーが発生しても処理を続行
    }

    // 2. 保存された正解情報があれば使用
    if (storedAnswer) {
      console.log("データベースから正解情報を取得:", storedAnswer);
      try {
        const correctEntries = JSON.parse(storedAnswer.answers) as JournalEntry[];
        const result = await checkAnswerWithAI(problem, userAnswers, correctEntries);
        return res.status(200).json(result);
      } catch (parseError) {
        console.error("保存された正解情報の解析に失敗:", parseError);
        // 解析エラーの場合は次の方法で試行
      }
    }

    // 3. テンプレートベースのチェック
    const template = findMatchingTemplate(problem);
    if (template) {
      console.log("テンプレートベースのチェックを使用");
      const result = template.check(problem, userAnswers);
      return res.status(200).json(result);
    }

    // 4. AI による評価
    console.log("AIによる回答チェックを使用");
    const result = await checkAnswerWithAI(problem, userAnswers);
    return res.status(200).json(result);
  } catch (error) {
    console.error("回答チェックエラー:", error);
    res.status(500).json({
      error: "回答のチェック中にエラーが発生しました",
      correctAnswer: [
        {
          id: 1,
          debitAccount: "エラー発生",
          debitAmount: 0,
          creditAccount: "エラー発生",
          creditAmount: 0,
          note: "サーバーでエラーが発生しました。もう一度お試しください。"
        }
      ]
    });
  }
}

// AI正解のみを生成する関数
async function generateCorrectAnswerWithAI(problem: Problem, res: NextApiResponse): Promise<void> {
  const prompt = `
    以下の日商簿記検定3級レベルの問題に対する正しい仕訳と簡潔な解説を示してください。
    複数の取引を含む場合や複合仕訳が必要な場合は、それぞれの取引に対応する仕訳を全て含めてください。

    【問題】
    ${problem.content}
    
    以下の形式でJSON形式のみで回答してください:
    {
      "explanation": "この取引の解説（簡潔に）",
      "correctAnswer": [
        {
          "id": 1,
          "debitAccount": "借方の勘定科目名",
          "debitAmount": 金額（数値）,
          "creditAccount": "貸方の勘定科目名",
          "creditAmount": 金額（数値）,
          "note": "この勘定科目の選択理由（簡潔に）"
        },
        // 複数の仕訳がある場合は追加
        {
          "id": 2,
          "debitAccount": "2つ目の借方勘定科目名",
          "debitAmount": 金額（数値）,
          "creditAccount": "2つ目の貸方勘定科目名",
          "creditAmount": 金額（数値）,
          "note": "この勘定科目の選択理由（簡潔に）"
        }
      ]
    }
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { 
        role: "system", 
        content: `あなたは日商簿記検定の専門家です。
日商簿記検定では商品売買の処理に三分法を採用しています。
商品の仕入れには「仕入」勘定科目を使用し、
商品の販売には「売上」勘定科目を使用します。
日商簿記検定の基準に従って、正確な解答と簡潔な解説を提供してください。

以下の勘定科目の使い方に注意してください：
・商品の仕入れ → 「仕入」勘定（三分法）
・固定資産の購入 → 「建物」「備品」「車両運搬具」などの資産勘定
・費用の支払い → 「給料」「家賃」「水道光熱費」「通信費」などの費用勘定
・収益の発生 → 「売上」「受取利息」などの収益勘定
・手形取引 → 「受取手形」「支払手形」
・資金調達 → 「借入金」「資本金」

複合仕訳が必要な場合や複数の取引がある場合は、それぞれに対応する仕訳を全て含めてください。` 
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("AIからの回答が空です");
  }

  try {
    const result = JSON.parse(content);
    
    // 回答形式をCheckResult形式に変換
    const checkResult: CheckResult = {
      isCorrect: false, // 正解の表示なので常にfalse
      explanation: result.explanation || "問題の解説",
      correctAnswer: Array.isArray(result.correctAnswer) ? result.correctAnswer.map((entry: any, index: number) => ({
        id: entry.id || index + 1,
        debitAccount: entry.debitAccount || "",
        debitAmount: typeof entry.debitAmount === "number" ? entry.debitAmount : 0,
        creditAccount: entry.creditAccount || "",
        creditAmount: typeof entry.creditAmount === "number" ? entry.creditAmount : 0,
        note: entry.note || ""
      })) : []
    };
    
    res.status(200).json(checkResult);
  } catch (error) {
    console.error("AI応答のパースに失敗:", error, content);
    throw new Error("AI応答の解析に失敗しました");
  }
}

// AIによる回答チェック
async function checkAnswerWithAI(
  problem: Problem,
  userAnswers: JournalEntry[],
  correctEntries?: JournalEntry[]
): Promise<CheckResult> {
  try {
    // 整形された入力を作成
    let formattedUserAnswers = userAnswers.map((entry, index) => {
      return `仕訳${index + 1}: (借) ${entry.debitAccount} ${
        entry.debitAmount
      }円 / (貸) ${entry.creditAccount} ${entry.creditAmount}円`;
    });

    let correctAnswerPrompt = "";
    if (correctEntries && correctEntries.length > 0) {
      const formattedCorrectAnswers = correctEntries.map((entry, index) => {
        return `仕訳${index + 1}: (借) ${entry.debitAccount || ""} ${
          entry.debitAmount || 0
        }円 / (貸) ${entry.creditAccount || ""} ${entry.creditAmount || 0}円`;
      });
      correctAnswerPrompt = `
正解の仕訳は以下の通りです:
${formattedCorrectAnswers.join("\n")}`;
    }

    const prompt = `
あなたは日商簿記検定試験の採点官です。以下の簿記問題とユーザーの回答を評価してください。

【問題】
${problem.content}

【ユーザーの回答】
${formattedUserAnswers.join("\n")}
${correctAnswerPrompt}

【採点基準】
1. 借方・貸方の勘定科目が日商簿記検定で認められている正式な勘定科目名であること
2. 取引の性質に応じた正しい勘定科目が選択されていること
3. 借方と貸方の金額が一致していること（貸借平均の原則）
4. 必要な仕訳がすべて含まれていること

以下の形式でJSON形式のみで回答してください（他の説明は一切不要です）:
{
  "isCorrect": true/false,
  "explanation": "採点結果と解説（簿記の原則に基づいて説明）",
  "correctAnswer": [
    {
      "id": 1,
      "debitAccount": "借方の正しい勘定科目名",
      "debitAmount": 借方の正しい金額（数値）,
      "creditAccount": "貸方の正しい勘定科目名",
      "creditAmount": 貸方の正しい金額（数値）,
      "note": "この仕訳の説明（簡潔に）"
    }
  ]
}`;

    // OpenAI APIを使って回答を評価
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "あなたは日商簿記検定の採点官です。ユーザーの回答を日商簿記検定の基準に従って厳密に評価してください。勘定科目名や金額の正確さを重視し、基本的な簿記の原則に照らして解説してください。",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    // 応答をパース
    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("OpenAI APIからの応答が空です");
    }

    try {
      const result = JSON.parse(content) as CheckResult;
      console.log("AI評価結果:", result);
      
      // IDの追加確認
      if (result.correctAnswer) {
        result.correctAnswer = result.correctAnswer.map((entry, index) => {
          if (!entry.id) {
            return { ...entry, id: index + 1 };
          }
          return entry;
        });
      }
      
      return result;
    } catch (parseError) {
      console.error("OpenAI APIレスポンスのパースに失敗:", parseError, content);
      throw new Error("応答の解析に失敗しました");
    }
  } catch (error) {
    console.error("AIによる回答チェックに失敗:", error);
    // エラー時のフォールバック
    return {
      isCorrect: false,
      explanation:
        "回答の評価中にエラーが発生しました。もう一度お試しください。",
      correctAnswer: correctEntries
        ? correctEntries.map((entry, index) => ({ id: index + 1, ...entry }))
        : [
            {
              id: 1,
              debitAccount: "エラー発生",
              debitAmount: 0,
              creditAccount: "エラー発生",
              creditAmount: 0,
              note: "評価中にエラーが発生しました"
            },
          ],
    };
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
