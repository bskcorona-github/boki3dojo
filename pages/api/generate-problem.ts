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
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `あなたは日商簿記検定試験の専門家です。日商簿記検定${difficulty}級レベルの仕訳問題を1つ作成してください。

次の形式のJSONで返してください：
{
  "title": "簡潔な問題タイトル",
  "content": "問題文（取引内容を明確に説明）",
  "relevantAccounts": ["関連勘定科目1", "関連勘定科目2", "関連勘定科目3", "関連勘定科目4", "関連勘定科目5"],
  "correctAnswer": {
    "explanation": "解答の解説",
    "journalEntries": [
      {
        "debitAccount": "借方勘定科目",
        "debitAmount": 金額,
        "creditAccount": "貸方勘定科目",
        "creditAmount": 金額
      }
    ]
  }
}

必ず守るべき事項:
1. 日商簿記検定${difficulty}級の出題範囲に準拠した問題にすること
2. 問題文と正解の仕訳が矛盾しないこと
3. 取引の種類（現金取引、掛取引など）を明確に区別すること
4. 勘定科目は日商簿記検定${difficulty}級で使用される標準的なものを使用すること
5. 問題は日商簿記検定の実際の出題形式に近い、実務的で明確な状況設定にすること
6. relevantAccountsには、正解のjournalEntriesで使用するすべての勘定科目を必ず含めること。これは非常に重要です。
7. relevantAccountsには、正解に必要な勘定科目と関連する勘定科目を合計5つ以上含めること
8. 複合仕訳の場合は複数のjournalEntriesを含めること
9. 日商簿記検定では三分法を採用しています。商品の仕入れ取引は、「商品」ではなく「仕入」勘定を使用してください。
10. 一問の中で複数の取引を含む問題も作成可能です。その場合は、各取引に対応する複数の仕訳を含めてください。

下記の取引パターンから、まだ出題していないバリエーションを選んで問題を作成してください：
・商品売買取引（掛け・現金）
・固定資産の購入・売却
・費用の支払い（給料、家賃、水道光熱費など）
・収益の発生（受取利息など）
・資金の調達・返済（借入金、貸付金など）
・手形取引（受取手形、支払手形）
・税金関連（消費税、法人税など）
・資本金の増減
・前払金・前受金、未払金・未収金
・複合取引（複数仕訳が必要なもの）

時には次のような複雑な問題も作成してください：
・一つの取引で複数の勘定科目が関わるもの
・複数の取引をまとめて出題して、2〜3行の仕訳解答が必要なもの
・消費税を含む取引`,
        },
        {
          role: "user",
          content: `日商簿記検定${difficulty}級の仕訳問題を1つ作成してください。今回は、単純な商品売買だけでなく、バリエーション豊かな取引を題材にしてください。可能であれば、2〜3行の仕訳が必要になる複合的な取引も含めてください。

また、日商簿記検定では三分法を採用しているため、商品の仕入れには「商品」ではなく「仕入」勘定科目を使用してください。`,
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
    
    // 正解仕訳で使用される勘定科目を先に抽出
    const correctAccountNames = new Set<string>();
    if (
      correctAnswer.journalEntries &&
      correctAnswer.journalEntries.length > 0
    ) {
      correctAnswer.journalEntries.forEach((entry: any) => {
        if (entry.debitAccount) correctAccountNames.add(entry.debitAccount);
        if (entry.creditAccount) correctAccountNames.add(entry.creditAccount);
      });
    }

    // 正解に含まれる勘定科目を最優先で含める
    if (correctAccountNames.size > 0) {
      const correctAccounts = allAccounts.filter(
        (account) => correctAccountNames.has(account.name)
      );
      
      // データベースに存在しない勘定科目は新しく作成
      const missingAccountNames = Array.from(correctAccountNames).filter(
        name => !correctAccounts.some(account => account.name === name)
      );
      
      const missingAccounts = missingAccountNames.map((name, index) => ({
        id: 10000 + index,
        name,
        type: "追加",
        category: "その他"
      })) as AccountItem[];
      
      relevantAccounts = [...correctAccounts, ...missingAccounts];
    }
    
    // AIが選んだ関連勘定科目を追加
    if (
      generatedData.relevantAccounts &&
      Array.isArray(generatedData.relevantAccounts)
    ) {
      // AIが選出した勘定科目名と一致するものをフィルタリング
      const accountNames = generatedData.relevantAccounts;
      const aiSelectedAccounts = allAccounts.filter(
        (account) => accountNames.includes(account.name) && 
                     !relevantAccounts.some(ra => ra.name === account.name)
      );
      
      relevantAccounts = [...relevantAccounts, ...aiSelectedAccounts];

      // 10個に満たない場合は、ランダムに追加
      if (relevantAccounts.length < 10 && allAccounts.length > 0) {
        // すでに含まれていないアカウントをランダムに追加
        const remainingAccounts = allAccounts.filter(
          (account) => !relevantAccounts.some((ra) => ra.id === account.id)
        );

        // ランダムにシャッフル
        const shuffled = [...remainingAccounts].sort(() => 0.5 - Math.random());

        // 必要な数だけ追加
        const needed = 10 - relevantAccounts.length;
        relevantAccounts = [...relevantAccounts, ...shuffled.slice(0, needed)];
      }
    } else {
      // AIが勘定科目を返さなかった場合、デフォルトの勘定科目を使用
      const defaultAccounts = [
        { id: 1, name: "現金", type: "資産", category: "資産" },
        { id: 3, name: "普通預金", type: "資産", category: "資産" },
        { id: 4, name: "売掛金", type: "資産", category: "資産" },
        { id: 8, name: "商品", type: "資産", category: "資産" },
        { id: 25, name: "買掛金", type: "負債", category: "負債" },
        { id: 30, name: "売上", type: "収益", category: "収益" },
        { id: 31, name: "仕入", type: "費用", category: "費用" },
        { id: 32, name: "給料", type: "費用", category: "費用" },
        { id: 33, name: "家賃", type: "費用", category: "費用" },
        { id: 34, name: "水道光熱費", type: "費用", category: "費用" }
      ] as AccountItem[];
      
      // 正解に含まれる勘定科目がデフォルト科目に含まれていない場合は追加
      if (correctAccountNames.size > 0) {
        const missingAccounts = Array.from(correctAccountNames)
          .filter(name => !defaultAccounts.some(account => account.name === name))
          .map((name, index) => ({
            id: 10000 + index,
            name,
            type: "追加",
            category: "その他"
          })) as AccountItem[];
          
        relevantAccounts = [...defaultAccounts, ...missingAccounts];
      } else {
        relevantAccounts = defaultAccounts;
      }
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
