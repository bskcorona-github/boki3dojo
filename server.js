const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

// 環境変数の読み込み
dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 3001;

// OpenAI API クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ミドルウェア
app.use(cors());
app.use(express.json());

// モックデータ
const mockAccountItems = [
  { id: 1, name: '現金', category: '資産', display_order: 1 },
  { id: 2, name: '当座預金', category: '資産', display_order: 2 },
  { id: 3, name: '普通預金', category: '資産', display_order: 3 },
  { id: 4, name: '定期預金', category: '資産', display_order: 4 },
  { id: 5, name: '売掛金', category: '資産', display_order: 5 },
  { id: 6, name: '商品', category: '資産', display_order: 6 },
  { id: 7, name: '貸付金', category: '資産', display_order: 7 },
  { id: 8, name: '建物', category: '資産', display_order: 8 },
  { id: 9, name: '備品', category: '資産', display_order: 9 },
  { id: 10, name: '買掛金', category: '負債', display_order: 10 },
  { id: 11, name: '借入金', category: '負債', display_order: 11 },
  { id: 12, name: '資本金', category: '純資産', display_order: 12 },
  { id: 13, name: '売上', category: '収益', display_order: 13 },
  { id: 14, name: '受取利息', category: '収益', display_order: 14 },
  { id: 15, name: '給料', category: '費用', display_order: 15 },
  { id: 16, name: '家賃', category: '費用', display_order: 16 },
  { id: 17, name: '水道光熱費', category: '費用', display_order: 17 },
  { id: 18, name: '通信費', category: '費用', display_order: 18 },
  { id: 19, name: '雑費', category: '費用', display_order: 19 },
  { id: 20, name: '仮受消費税', category: '負債', display_order: 20 }
];

// APIルート

// 勘定科目一覧取得API
app.get("/api/account-items", (req, res) => {
  try {
    res.json(mockAccountItems);
  } catch (error) {
    console.error("Error fetching account items:", error);
    res.status(500).json({ error: "データベースエラーが発生しました。" });
  }
});

// 問題生成API
app.post("/api/generate-problem", async (req, res) => {
  try {
    const { difficulty } = req.body || { difficulty: "初級" };

    // AIを使用して問題生成を試みる
    try {
      const prompt = `
        日商簿記検定3級レベルの仕訳問題を1つ作成してください。

        【条件】
        1. 日商簿記検定3級の出題範囲内の基本的な取引に限定する
        2. 日付と金額を明確に記載する
        3. 1〜3つの取引を含む問題にする
        4. 特殊な会計処理や複雑な計算を含めない
        5. 日商簿記検定の実際の出題形式に近い問題にする
        6. 解答で必要となる勘定科目はすべて明示してください
        7. 単純な商品売買だけでなく、多様な取引パターンから出題する
        
        【出題可能な取引パターン】
        ・商品売買（三分法：「仕入」勘定を使用）
        ・固定資産の購入・売却
        ・費用の支払い（給料・家賃・水道光熱費など）
        ・収益の受取（受取利息など）
        ・手形取引（受取手形・支払手形）
        ・資金調達（借入金・資本金）
        ・前払金・前受金、未払金・未収金
        ・複合取引（複数仕訳が必要なもの）
        
        複数の取引を組み合わせて、2〜3行の仕訳が必要になる問題も時々出題してください。
        
        【例題】
        「次の取引について仕訳しなさい。6月10日：商品￥50,000を掛けで仕入れた。6月15日：上記商品￥70,000を現金で販売した。」
        
        以下の形式でJSON形式のみで回答してください:
        {
          "title": "簡潔な問題タイトル",
          "content": "問題文（日付と金額を含む）",
          "correctAnswer": {
            "debitAccount": "借方の勘定科目",
            "creditAccount": "貸方の勘定科目"
          }
        }
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "あなたは日商簿記検定3級の問題作成の専門家です。日商簿記検定3級の標準的な問題集に載っているような、シンプルで明確な問題を作成してください。" },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const problemData = JSON.parse(completion.choices[0].message.content);
      
      // 問題IDを追加
      problemData.id = Date.now();
      
      // 使用される勘定科目を抽出
      const requiredAccounts = new Set();
      if (problemData.correctAnswer) {
        if (problemData.correctAnswer.debitAccount) {
          requiredAccounts.add(problemData.correctAnswer.debitAccount);
        }
        if (problemData.correctAnswer.creditAccount) {
          requiredAccounts.add(problemData.correctAnswer.creditAccount);
        }
      }
      
      // 関連勘定科目に必要な勘定科目を確実に含める
      const relevantAccounts = Array.from(requiredAccounts);
      
      // 不足分は標準的な勘定科目から補充
      const standardAccounts = [
        "現金", "普通預金", "売掛金", "買掛金", "商品", "固定資産", 
        "借入金", "資本金", "売上", "仕入", "給料", "家賃", "水道光熱費", "通信費"
      ];
      
      for (const account of standardAccounts) {
        if (relevantAccounts.length < 12 && !relevantAccounts.includes(account)) {
          relevantAccounts.push(account);
        }
      }
      
      // 必要な勘定科目と追加の勘定科目を合わせて問題データに追加
      const selectedAccounts = mockAccountItems.filter(item => 
        relevantAccounts.includes(item.name)
      );
      
      // すべての必要勘定科目がmockAccountItemsに含まれているか確認
      const missingAccounts = Array.from(requiredAccounts).filter(
        acc => !selectedAccounts.some(item => item.name === acc)
      );
      
      // 見つからなかった勘定科目を追加
      const additionalAccounts = missingAccounts.map((name, i) => ({
        id: 1000 + i,
        name,
        category: '資産',
        display_order: 100 + i
      }));
      
      // 最終的な関連勘定科目リスト
      problemData.relevantAccounts = [...selectedAccounts, ...additionalAccounts];

      res.json(problemData);
    } catch (aiError) {
      console.error("AIによる問題生成エラー:", aiError);
      // エラー時はフォールバックとしてダミーデータを返す
      res.json({
        id: Date.now(),
        title: "商品の仕入れ",
        content: "次の取引について仕訳しなさい。3月5日：商品¥80,000を掛けで仕入れた。",
        relevantAccounts: [
          { id: 31, name: "仕入", category: "費用", display_order: 31 },
          { id: 10, name: "買掛金", category: "負債", display_order: 10 },
          { id: 1, name: "現金", category: "資産", display_order: 1 },
          { id: 3, name: "普通預金", category: "資産", display_order: 3 },
          { id: 4, name: "売掛金", category: "資産", display_order: 4 },
          { id: 13, name: "売上", category: "収益", display_order: 13 },
          { id: 15, name: "給料", category: "費用", display_order: 15 },
          { id: 16, name: "家賃", category: "費用", display_order: 16 }
        ]
      });
    }
  } catch (error) {
    console.error("Error generating problem:", error);
    res.status(500).json({ error: "問題生成中にエラーが発生しました。" });
  }
});

// 回答チェックAPI
app.post("/api/check-answer", async (req, res) => {
  try {
    const { problem, userAnswers } = req.body;
    
    if (!problem || !userAnswers) {
      return res.status(400).json({ error: "問題と回答は必須です。" });
    }

    // ユーザー回答が空配列または空の回答内容の場合（正解を見る場合など）
    if (userAnswers.length === 0 || 
        (userAnswers.length === 1 && 
         !userAnswers[0].debitAccount && 
         !userAnswers[0].creditAccount)) {
      
      // 問題文から金額を抽出
      let amount = 80000; // デフォルト値
      if (problem.content) {
        const match = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)円/);
        if (match) {
          amount = parseInt(match[1].replace(/,/g, ""));
        }
      }
      
      // 問題内容に基づいてデフォルトの正解を生成
      if (problem.content.includes("仕入") || problem.content.includes("商品") || problem.content.includes("購入")) {
        // 掛け取引の場合
        if (problem.content.includes("掛け") || problem.content.includes("掛けで")) {
          return res.json({
            isCorrect: false,
            explanation: "商品を掛けで仕入れた場合、「仕入」という費用勘定科目が増加するため借方に記入し、「買掛金」という負債が増加するため貸方に記入します。日商簿記検定では三分法を採用しています。",
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
          // 現金取引の場合
          return res.json({
            isCorrect: false,
            explanation: "商品を現金で仕入れた場合、「仕入」という費用勘定科目が増加するため借方に記入し、「現金」という資産が減少するため貸方に記入します。日商簿記検定では三分法を採用しています。",
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
      } else if (problem.content.includes("売上") || problem.content.includes("販売")) {
        // 売上の問題の場合
        const match = problem.content.match(/(\d{1,3}(,\d{3})*|\d+)円/);
        const amount = match ? parseInt(match[1].replace(/,/g, "")) : 100000;
        
        if (problem.content.includes("掛け")) {
          return res.json({
            isCorrect: false,
            explanation: "商品を掛けで販売した場合、「売掛金」という資産が増加するため借方に記入し、「売上」という収益が増加するため貸方に記入します。",
            correctAnswer: [
              {
                id: 1,
                debitAccount: "売掛金",
                debitAmount: amount,
                creditAccount: "売上",
                creditAmount: amount,
                note: "「売掛金」は資産の勘定科目、「売上」は収益の勘定科目です。"
              }
            ]
          });
        } else {
          return res.json({
            isCorrect: false,
            explanation: "商品を現金で販売した場合、「現金」という資産が増加するため借方に記入し、「売上」という収益が増加するため貸方に記入します。",
            correctAnswer: [
              {
                id: 1,
                debitAccount: "現金",
                debitAmount: amount,
                creditAccount: "売上",
                creditAmount: amount,
                note: "「現金」は資産の勘定科目、「売上」は収益の勘定科目です。"
              }
            ]
          });
        }
      } else {
        // AIを使って正解を生成
        try {
          const prompt = `
            以下の日商簿記検定3級の問題に対する正しい仕訳と簡潔な解説を示してください。
            複数の取引を含む場合や複合仕訳が必要な場合は、それぞれの取引に対応する仕訳をすべて含めてください。

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
                  "note": "勘定科目の説明（簡潔に）"
                },
                {
                  "id": 2,
                  "debitAccount": "2つ目の借方勘定科目名（複数仕訳の場合）",
                  "debitAmount": 金額（数値）,
                  "creditAccount": "2つ目の貸方勘定科目名",
                  "creditAmount": 金額（数値）,
                  "note": "勘定科目の説明（簡潔に）"
                }
              ]
            }
          `;

          const completion = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [
              { role: "system", content: "あなたは日商簿記検定3級の採点官です。問題に対する正確な解答と簡潔な解説を提供してください。日商簿記検定では三分法を採用しており、商品の仕入れには「仕入」勘定科目を使用します。複数取引の問題には、それぞれの取引に対応する複数の仕訳を含めてください。" },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
          });

          const result = JSON.parse(completion.choices[0].message.content);
          
          // レスポンス構造を整える
          return res.json({
            isCorrect: false,
            explanation: result.explanation || "正解の解説です。",
            correctAnswer: result.correctAnswer || []
          });
        } catch (aiError) {
          console.error("AIによる正解生成エラー:", aiError);
          // AIエラー時はデフォルトの応答を返す
          return res.json({
            isCorrect: false,
            explanation: "問題に対する正解例です。",
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
    }
    
    // 実際の回答チェック（ユーザーが回答提出した場合）
    const prompt = `
      日商簿記検定3級の問題と回答を採点してください。
      複数の取引や複合仕訳が必要な場合は、すべての仕訳が正しいかを評価してください。

      【問題】
      ${problem.content}
      
      【ユーザーの回答】
      ${JSON.stringify(userAnswers, null, 2)}
      
      以下の形式でJSON形式のみで回答してください:
      {
        "isCorrect": true/false,
        "explanation": "採点結果と解説（簡潔に、日商簿記検定の採点基準に基づいて）",
        "correctAnswer": [
          {
            "id": 1,
            "debitAccount": "借方の正しい勘定科目名",
            "debitAmount": 借方の正しい金額（数値）,
            "creditAccount": "貸方の正しい勘定科目名",
            "creditAmount": 貸方の正しい金額（数値）,
            "note": "勘定科目の説明（簡潔に）"
          },
          {
            "id": 2,
            "debitAccount": "2つ目の借方勘定科目名（複数仕訳の場合）",
            "debitAmount": 借方の正しい金額（数値）,
            "creditAccount": "2つ目の貸方勘定科目名",
            "creditAmount": 貸方の正しい金額（数値）,
            "note": "勘定科目の説明（簡潔に）"
          }
        ]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "あなたは日商簿記検定3級の採点官です。問題に対する解答を日商簿記検定の採点基準に従って厳密に評価してください。日商簿記検定では三分法を採用しており、商品の仕入れには「仕入」勘定科目を使用します。複数取引や複合仕訳が必要な問題では、すべての仕訳が正確かどうかを評価してください。" },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    res.json(result);
  } catch (error) {
    console.error("Error checking answer:", error);
    res.status(500).json({ error: "回答チェック中にエラーが発生しました。" });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
