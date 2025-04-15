import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import styles from "../styles/Problem.module.css";
import { JournalEntry } from "../pages/api/api-types";
import { useRouter } from "next/router";

// 問題の型定義
interface Problem {
  id: number;
  title: string;
  content: string;
  relevantAccounts?: AccountItem[];
}

// 勘定科目の型定義
interface AccountItem {
  id: number;
  name: string;
  type?: string;
  category?: string;
  display_order?: number;
}

// 正解情報の型定義
interface CorrectAnswer {
  isCorrect: boolean;
  explanation: string;
  correctAnswer: JournalEntry[];
}

export default function Problem() {
  const router = useRouter();
  const { id } = router.query;
  // 状態管理
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([
    {
      id: 1,
      debitAccount: "",
      debitAmount: 0,
      creditAccount: "",
      creditAmount: 0,
    },
  ]);
  const [accountItems, setAccountItems] = useState<AccountItem[]>([]);
  const [result, setResult] = useState<CorrectAnswer | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<CorrectAnswer | null>(
    null
  ); // 正解情報を保持
  const [showResult, setShowResult] = useState(false);
  const [gaveUp, setGaveUp] = useState(false); // 回答を見たかどうかのフラグ
  const [answerLoading, setAnswerLoading] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [showingAnswer, setShowingAnswer] = useState(false);

  // 新しい問題を取得する関数
  const fetchNewProblem = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/generate-problem`
      );
      setProblem(response.data);

      // 問題に関連する勘定科目を設定
      if (
        response.data.relevantAccounts &&
        Array.isArray(response.data.relevantAccounts) &&
        response.data.relevantAccounts.length > 0
      ) {
        // 問題に関連する勘定科目があれば使用
        setAccountItems(response.data.relevantAccounts);
      } else {
        // 関連勘定科目がない場合はデフォルトのリストを取得
        const accountResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/account-items`
        );
        setAccountItems(accountResponse.data);
      }

      // 生成した問題の正解も取得し、保存しておく
      try {
        // 自動的に正解を取得
        const checkResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/check-answer`,
          {
            problem: response.data,
            userAnswers: [
              {
                id: 1,
                debitAccount: "",
                debitAmount: 0,
                creditAccount: "",
                creditAmount: 0,
              },
            ]
          }
        );

        // 正解情報を状態に保存
        if (checkResponse.data) {
          setCorrectAnswer({
            isCorrect: false,
            explanation: checkResponse.data.explanation || "正解の解説です。",
            correctAnswer: Array.isArray(checkResponse.data.correctAnswer)
              ? checkResponse.data.correctAnswer
              : [],
          });

          // 正解の勘定科目リストを抽出して、ドロップダウンに必要な勘定科目が含まれているか確認
          const correctAnswerAccounts = new Set<string>();
          if (
            checkResponse.data.correctAnswer &&
            Array.isArray(checkResponse.data.correctAnswer)
          ) {
            checkResponse.data.correctAnswer.forEach((entry: JournalEntry) => {
              if (entry.debitAccount)
                correctAnswerAccounts.add(entry.debitAccount);
              if (entry.creditAccount)
                correctAnswerAccounts.add(entry.creditAccount);
            });
          }

          // すべての勘定科目を取得
          const allAccountsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/account-items`);
          const allAccounts = allAccountsResponse.data;

          // 現在の勘定科目リストに正解の勘定科目を追加
          if (correctAnswerAccounts.size > 0) {
            const currentAccountNames = new Set(
              accountItems.map((item) => item.name)
            );
            const missingAccountNames: string[] = [];

            correctAnswerAccounts.forEach((account) => {
              if (!currentAccountNames.has(account)) {
                missingAccountNames.push(account);
              }
            });

            // 正解に必要な勘定科目が不足している場合
            if (missingAccountNames.length > 0) {
              console.log("正解に必要な勘定科目を追加します:", missingAccountNames);

              // 不足している勘定科目を全勘定科目から検索
              const missingAccounts = allAccounts.filter(
                (account: AccountItem) => missingAccountNames.includes(account.name)
              );

              // 見つからない場合は一時的なオブジェクトとして追加
              const notFoundAccounts = missingAccountNames.filter(
                name => !missingAccounts.some((acc: AccountItem) => acc.name === name)
              ).map((name, index) => ({
                id: 10000 + index,
                name,
                type: "追加",
                category: "その他" // デフォルト値を修正
              }));

              setAccountItems(prev => [...prev, ...missingAccounts, ...notFoundAccounts]);
            }
          }
        }
      } catch (checkError) {
        console.error("正解勘定科目の取得に失敗しました:", checkError);
        
        // エラー時のフォールバック
        setCorrectAnswer({
          isCorrect: false,
          explanation: "日商簿記検定の基準に従った解答です。",
          correctAnswer: [
            {
              id: 1,
              debitAccount: "仕入",
              debitAmount: 50000,
              creditAccount: "買掛金",
              creditAmount: 50000,
              note: "日商簿記検定では三分法を採用しており、商品の仕入れには「仕入」勘定科目を使用します。"
            }
          ]
        });
        
        // エラー時は全勘定科目リストを取得して使用
        try {
          const allAccountsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/account-items`);
          // 「仕入」が含まれていることを確認
          const allAccounts = allAccountsResponse.data;
          const hasHiireAccount = allAccounts.some((acc: AccountItem) => acc.name === "仕入");
          
          if (!hasHiireAccount) {
            allAccounts.push({
              id: 10001,
              name: "仕入",
              type: "費用",
              category: "費用"
            });
          }
          
          setAccountItems(allAccounts);
        } catch (error) {
          console.error("勘定科目リスト取得エラー:", error);
          // 最低限必要な勘定科目を設定
          setAccountItems([
            { id: 1, name: "現金", category: "資産" },
            { id: 3, name: "売掛金", category: "資産" },
            { id: 31, name: "仕入", category: "費用" },
            { id: 5, name: "買掛金", category: "負債" },
            { id: 7, name: "売上", category: "収益" },
          ]);
        }
      }
    } catch (error) {
      console.error("問題取得エラー:", error);
      // デモ用ダミーデータ
      setProblem({
        id: 1,
        title: "商品の仕入れと売上の記帳",
        content:
          "次の取引について仕訳しなさい。1月15日：商品¥50,000を掛けで仕入れた。1月20日：上記商品¥70,000を掛けで販売した。",
      });

      // デモ用勘定科目データ（最小限の選択肢）
      setAccountItems([
        { id: 1, name: "現金", category: "資産" },
        { id: 3, name: "売掛金", category: "資産" },
        { id: 4, name: "商品", category: "資産" },
        { id: 5, name: "買掛金", category: "負債" },
        { id: 7, name: "売上", category: "収益" },
      ]);

      // デモ用正解データ
      setCorrectAnswer({
        isCorrect: false,
        explanation: "正解の解説です。",
        correctAnswer: [
          {
            id: 1,
            debitAccount: "商品",
            debitAmount: 50000,
            creditAccount: "買掛金",
            creditAmount: 50000,
          },
          {
            id: 2,
            debitAccount: "売掛金",
            debitAmount: 70000,
            creditAccount: "売上",
            creditAmount: 70000,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  // 問題を取得
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);

        // idがundefinedの場合は新しい問題を生成
        if (!id) {
          await fetchNewProblem();
          return;
        }

        // 問題を取得
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/problems/${id}`
        );
        setProblem(response.data);

        // 問題に関連する勘定科目を取得
        try {
          // 問題に関連する勘定科目があれば取得
          const accountResponse = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/problems/${id}/accounts`
          );
          
          if (accountResponse.data && accountResponse.data.length > 0) {
            setAccountItems(accountResponse.data);
          } else {
            // なければ全リストを取得
            const allAccountsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/account-items`);
            setAccountItems(allAccountsResponse.data);
          }
        } catch (accountError) {
          console.error("勘定科目の取得に失敗しました:", accountError);
          // エラー時は全リストを取得
          const allAccountsResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/account-items`);
          setAccountItems(allAccountsResponse.data);
        }

        // 問題の正解情報も取得
        try {
          const correctResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/check-answer`,
            {
              problem: response.data,
              userAnswers: [
                {
                  id: 1,
                  debitAccount: "",
                  debitAmount: 0,
                  creditAccount: "",
                  creditAmount: 0,
                }
              ]
            }
          );

          // 正解情報を状態に保存
          setCorrectAnswer({
            isCorrect: false,
            explanation: correctResponse.data.explanation || "正解の解説です。",
            correctAnswer: Array.isArray(correctResponse.data.correctAnswer)
              ? correctResponse.data.correctAnswer
              : [],
          });
          
          // 正解の勘定科目が選択肢にあるか確認
          if (
            correctResponse.data.correctAnswer &&
            Array.isArray(correctResponse.data.correctAnswer)
          ) {
            // 正解で使用されるすべての勘定科目を抽出
            const correctAccountNames = new Set<string>();
            correctResponse.data.correctAnswer.forEach((entry: JournalEntry) => {
              if (entry.debitAccount) correctAccountNames.add(entry.debitAccount);
              if (entry.creditAccount) correctAccountNames.add(entry.creditAccount);
            });

            // 現在の勘定科目リストに正解の勘定科目が含まれているか確認
            if (correctAccountNames.size > 0) {
              const currentAccountNames = new Set(
                accountItems.map((item) => item.name)
              );

              // 現在の選択肢に含まれていない正解勘定科目を特定
              const missingAccountNames: string[] = [];
              correctAccountNames.forEach((name) => {
                if (!currentAccountNames.has(name)) {
                  missingAccountNames.push(name);
                  console.log(`正解に必要な勘定科目「${name}」が選択肢にありません。追加します。`);
                }
              });

              // 不足している勘定科目がある場合は追加
              if (missingAccountNames.length > 0) {
                const newAccountItems = missingAccountNames.map((name, index) => ({
                  id: 10000 + index,
                  name,
                  type: "追加",
                  category: "その他"
                }));
                
                setAccountItems(prev => [...prev, ...newAccountItems]);
              }
            }
          }
        } catch (correctError) {
          console.error("正解情報の取得に失敗しました:", correctError);
        }
      } catch (error) {
        console.error("問題の取得に失敗しました:", error);
        // エラー時は新しい問題を生成
        await fetchNewProblem();
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [id]);

  // 仕訳行を追加
  const addJournalEntry = () => {
    const newId =
      journalEntries.length > 0
        ? Math.max(...journalEntries.map((entry) => entry.id || 0)) + 1
        : 1;
    setJournalEntries([
      ...journalEntries,
      {
        id: newId,
        debitAccount: "",
        debitAmount: 0,
        creditAccount: "",
        creditAmount: 0,
      },
    ]);
  };

  // 仕訳行を削除
  const removeJournalEntry = (id: number) => {
    if (journalEntries.length > 1) {
      setJournalEntries(journalEntries.filter((entry) => entry.id !== id));
    }
  };

  // 仕訳入力の変更を処理
  const handleEntryChange = (
    id: number,
    field: keyof JournalEntry,
    value: string
  ) => {
    setJournalEntries(
      journalEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  // 解答を提出
  const submitAnswer = async () => {
    // 回答を見た後は提出できない
    if (gaveUp) {
      alert("すでに回答を見ているため、解答できません");
      return;
    }

    try {
      // 送信前にローディング状態にする
      setLoading(true);

      // 金額を数値に変換
      const formattedEntries = journalEntries.map((entry) => ({
        ...entry,
        debitAmount: entry.debitAmount ? Number(entry.debitAmount) : 0,
        creditAmount: entry.creditAmount ? Number(entry.creditAmount) : 0,
      }));

      // APIに解答を送信してチェック
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/check-answer`,
        {
          problem: problem,
          userAnswers: formattedEntries
        }
      );

      // レスポンスデータを検証
      const resultData = response.data;
      if (!resultData || typeof resultData !== "object") {
        throw new Error("APIからの応答が不正な形式です");
      }

      // 必須フィールドが存在することを確認
      const safeResult = {
        isCorrect: !!resultData.isCorrect,
        explanation: resultData.explanation || "採点結果が返されませんでした。",
        correctAnswer: Array.isArray(resultData.correctAnswer)
          ? resultData.correctAnswer
          : [],
      };

      // 結果をセット
      setResult(safeResult);
      setShowResult(true);
    } catch (error) {
      console.error("解答提出エラー:", error);

      // APIエラー時のフォールバック (保存済みの正解情報を使用)
      if (correctAnswer) {
        setResult({
          ...correctAnswer,
          isCorrect: false,
          explanation: "解答の採点中にエラーが発生しました。正解を表示します。",
        });
      } else {
        setResult({
          isCorrect: false,
          explanation:
            "解答の採点中にエラーが発生しました。もう一度お試しください。",
          correctAnswer: [],
        });
      }
      setShowResult(true);
    } finally {
      setLoading(false);
    }
  };

  // 新しい問題を取得
  const getNewProblem = () => {
    setShowResult(false);
    setGaveUp(false); // 新しい問題に進むときにフラグをリセット
    setJournalEntries([
      {
        id: 1,
        debitAccount: "",
        debitAmount: 0,
        creditAccount: "",
        creditAmount: 0,
      },
    ]);
    setResult(null);
    fetchNewProblem();
  };

  // 回答を見る（ギブアップ）
  const showAnswer = async () => {
    try {
      setAnswerLoading(true);
      console.log("回答を表示します...");

      // すでに取得済みの正解情報があれば使用
      if (correctAnswer) {
        setResult(correctAnswer);
        setGaveUp(true);
        setShowResult(true);
        setAnswerSubmitted(true);
        setShowingAnswer(true);
        setAnswerLoading(false);
        return;
      }

      // problemがnullでないことを確認
      if (!problem) {
        throw new Error("問題データがありません");
      }

      // APIを呼び出して正解を取得
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/check-answer`,
        {
          problem: problem,
          userAnswers: [] // 空の回答
        }
      );

      if (!response.data) {
        throw new Error("APIからの応答が不正です");
      }

      const result = response.data;
      console.log("API応答:", result);

      // 結果を設定 (常に不正解として表示)
      const safeResult = {
        isCorrect: false,
        explanation: result.explanation || "解答を表示しています",
        correctAnswer: Array.isArray(result.correctAnswer) ? result.correctAnswer : [],
      };

      setResult(safeResult);
      setCorrectAnswer(safeResult); // 取得した正解情報を保存

      // 解答を表示した状態にする
      setAnswerSubmitted(true);
      setShowingAnswer(true);
      setGaveUp(true); // ギブアップ状態を設定
      setShowResult(true); // 結果表示を有効化
    } catch (error) {
      console.error("回答表示中にエラーが発生しました:", error);
      setResult({
        isCorrect: false,
        explanation:
          "回答の取得中にエラーが発生しました。もう一度お試しください。",
        correctAnswer: [],
      });
      setAnswerSubmitted(true);
      setShowResult(true); // エラー時も結果表示を有効化
    } finally {
      setAnswerLoading(false);
    }
  };

  // もう一度解く
  const tryAgain = () => {
    // 回答を見ていなければ解き直し可能
    if (!gaveUp) {
      setShowResult(false);
      setResult(null);
    } else {
      alert("すでに回答を見ているため、解き直しできません");
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>簿記3級道場 - 問題読み込み中</title>
        </Head>
        <main className={styles.main}>
          <h1>問題を読み込み中...</h1>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>簿記3級道場 - 問題</title>
      </Head>

      <main className={styles.main}>
        <div className={styles.problemSection}>
          <h1 className={styles.problemTitle}>{problem?.title}</h1>
          <div className={styles.problemContent}>{problem?.content}</div>
        </div>

        <div className={styles.answerSection}>
          <h2>仕訳</h2>
          <div className={styles.journalTable}>
            <div className={styles.tableHeader}>
              <div className={styles.debitHeader}>借方科目</div>
              <div className={styles.amountHeader}>借方金額（円）</div>
              <div className={styles.creditHeader}>貸方科目</div>
              <div className={styles.amountHeader}>貸方金額（円）</div>
              <div className={styles.actionHeader}></div>
            </div>

            {journalEntries.map((entry) => (
              <div key={entry.id} className={styles.journalRow}>
                <select
                  className={styles.accountSelect}
                  value={entry.debitAccount}
                  onChange={(e) =>
                    handleEntryChange(entry.id!, "debitAccount", e.target.value)
                  }
                  disabled={showResult && gaveUp}
                >
                  <option value="">科目を選択</option>
                  {accountItems.map((item) => (
                    <option key={`debit-${item.id}`} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  className={styles.amountInput}
                  value={entry.debitAmount === 0 ? "" : entry.debitAmount}
                  onChange={(e) =>
                    handleEntryChange(entry.id!, "debitAmount", e.target.value)
                  }
                  disabled={showResult && gaveUp}
                />

                <select
                  className={styles.accountSelect}
                  value={entry.creditAccount}
                  onChange={(e) =>
                    handleEntryChange(
                      entry.id!,
                      "creditAccount",
                      e.target.value
                    )
                  }
                  disabled={showResult && gaveUp}
                >
                  <option value="">科目を選択</option>
                  {accountItems.map((item) => (
                    <option key={`credit-${item.id}`} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  className={styles.amountInput}
                  value={entry.creditAmount === 0 ? "" : entry.creditAmount}
                  onChange={(e) =>
                    handleEntryChange(entry.id!, "creditAmount", e.target.value)
                  }
                  disabled={showResult && gaveUp}
                />

                <button
                  className={styles.removeButton}
                  onClick={() => removeJournalEntry(entry.id!)}
                  disabled={
                    journalEntries.length <= 1 || (showResult && gaveUp)
                  }
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              className={styles.addButton}
              onClick={addJournalEntry}
              disabled={showResult && gaveUp}
            >
              + 仕訳を追加
            </button>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "20px",
              }}
            >
              <button
                className={`${styles.answerButton} ${styles.giveUpButton}`}
                onClick={showAnswer}
                disabled={gaveUp}
              >
                回答を見る
              </button>
              <button
                className={styles.submitButton}
                onClick={submitAnswer}
                disabled={showResult && gaveUp}
              >
                解答を提出
              </button>
            </div>
          </div>
        </div>

        {/* 結果エリア - showResultがtrueの場合のみ表示 */}
        {showResult && result && (
          <div className={styles.resultSection}>
            <h2
              className={result.isCorrect ? styles.correct : styles.incorrect}
            >
              {result.isCorrect ? "正解！" : "不正解..."}
            </h2>
            <div className={styles.explanation}>
              {result.explanation || "採点結果が正しく表示できません。"}
            </div>

            {(gaveUp || !result.isCorrect) && (
              <div className={styles.correctAnswer}>
                <h3>正解</h3>
                <div className={styles.journalTable}>
                  <div className={styles.tableHeader}>
                    <div className={styles.debitHeader}>借方科目</div>
                    <div className={styles.amountHeader}>借方金額（円）</div>
                    <div className={styles.creditHeader}>貸方科目</div>
                    <div className={styles.amountHeader}>貸方金額（円）</div>
                  </div>

                  {result.correctAnswer &&
                  Array.isArray(result.correctAnswer) &&
                  result.correctAnswer.length > 0 ? (
                    result.correctAnswer.map((entry: JournalEntry) => (
                      <div
                        key={entry.id || Math.random()}
                        className={styles.journalRow}
                      >
                        <div className={styles.accountCell}>
                          {entry.debitAccount || "（未設定）"}
                        </div>
                        <div className={styles.amountCell}>
                          {typeof entry.debitAmount === "number"
                            ? entry.debitAmount.toLocaleString()
                            : 0}
                        </div>
                        <div className={styles.accountCell}>
                          {entry.creditAccount || "（未設定）"}
                        </div>
                        <div className={styles.amountCell}>
                          {typeof entry.creditAmount === "number"
                            ? entry.creditAmount.toLocaleString()
                            : 0}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.journalRow}>
                      <span
                        className={styles.accountCell}
                        style={{ gridColumn: "span 4", textAlign: "center" }}
                      >
                        正解情報を取得できませんでした
                      </span>
                    </div>
                  )}
                </div>

                {/* 仕訳の個別解説（noteフィールドがある場合） */}
                {result.correctAnswer &&
                  Array.isArray(result.correctAnswer) &&
                  result.correctAnswer.length > 0 &&
                  result.correctAnswer.some(entry => entry.note) && (
                    <div className={styles.journalNotes}>
                      <h4>各仕訳の解説</h4>
                      {result.correctAnswer.map((entry, index) => (
                        entry.note && (
                          <div key={`note-${entry.id || index}`} className={styles.noteItem}>
                            <strong>仕訳{index + 1}:</strong> {entry.note}
                          </div>
                        )
                      ))}
                    </div>
                  )}
              </div>
            )}

            <div className={styles.buttonContainer}>
              {!result.isCorrect && !gaveUp && (
                <button className={styles.tryAgainButton} onClick={tryAgain}>
                  もう一度解く
                </button>
              )}
              <button className={styles.nextButton} onClick={getNewProblem}>
                次の問題へ
              </button>
            </div>
          </div>
        )}
      </main>

      <Link href="/" className={styles.backLink}>
        トップページに戻る
      </Link>
    </div>
  );
}
