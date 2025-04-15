import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "../styles/History.module.css";

// 学習履歴の型定義
interface HistoryItem {
  id: number;
  date: string;
  problemTitle: string;
  isCorrect: boolean;
  answerTime: number; // 秒
  topics: string[];
}

export default function History() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({
    totalProblems: 0,
    correctAnswers: 0,
    averageTime: 0,
    weeklyStreak: 0,
  });

  // 学習履歴のダミーデータを生成
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        // API呼び出しのシミュレーション
        setTimeout(() => {
          // ダミーデータの生成
          const today = new Date();
          const dummyHistory: HistoryItem[] = Array.from(
            { length: 20 },
            (_, i) => {
              const date = new Date(today);
              date.setDate(today.getDate() - i);
              return {
                id: i + 1,
                date: date.toISOString().split("T")[0],
                problemTitle: [
                  "商品の仕入れと売上の記帳",
                  "現金取引の仕訳",
                  "掛け取引の記帳",
                  "減価償却の処理",
                  "費用の前払いと未払い",
                ][Math.floor(Math.random() * 5)],
                isCorrect: Math.random() > 0.3, // 70%の確率で正解
                answerTime: 30 + Math.floor(Math.random() * 120), // 30秒〜150秒
                topics: ["仕訳", "資産", "負債", "収益", "費用"]
                  .sort(() => 0.5 - Math.random())
                  .slice(0, 1 + Math.floor(Math.random() * 3)),
              };
            }
          );

          setHistory(dummyHistory);

          // 統計データの計算
          const totalProblems = dummyHistory.length;
          const correctAnswers = dummyHistory.filter(
            (item) => item.isCorrect
          ).length;
          const averageTime =
            dummyHistory.reduce((acc, curr) => acc + curr.answerTime, 0) /
            totalProblems;

          setStats({
            totalProblems,
            correctAnswers,
            averageTime,
            weeklyStreak: 5, // ダミーデータ
          });

          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("履歴取得エラー:", error);
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>簿記3級道場 - 学習履歴</title>
        </Head>
        <main className={styles.main}>
          <h1>学習履歴を読み込み中...</h1>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>簿記3級道場 - 学習履歴</title>
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>学習履歴</h1>

        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <h3>解いた問題数</h3>
            <p className={styles.statValue}>{stats.totalProblems}</p>
          </div>

          <div className={styles.statCard}>
            <h3>正答率</h3>
            <p className={styles.statValue}>
              {Math.round((stats.correctAnswers / stats.totalProblems) * 100)}%
            </p>
          </div>

          <div className={styles.statCard}>
            <h3>平均解答時間</h3>
            <p className={styles.statValue}>
              {Math.round(stats.averageTime)}秒
            </p>
          </div>

          <div className={styles.statCard}>
            <h3>連続学習日数</h3>
            <p className={styles.statValue}>{stats.weeklyStreak}日</p>
          </div>
        </div>

        <div className={styles.historyContainer}>
          <h2>最近の学習記録</h2>

          <div className={styles.historyTable}>
            <div className={styles.tableHeader}>
              <div className={styles.dateColumn}>日付</div>
              <div className={styles.problemColumn}>問題</div>
              <div className={styles.resultColumn}>結果</div>
              <div className={styles.timeColumn}>解答時間</div>
            </div>

            {history.map((item) => (
              <div key={item.id} className={styles.historyRow}>
                <div className={styles.dateColumn}>{formatDate(item.date)}</div>
                <div className={styles.problemColumn}>
                  <div className={styles.problemTitle}>{item.problemTitle}</div>
                  <div className={styles.topicTags}>
                    {item.topics.map((topic, i) => (
                      <span key={i} className={styles.topicTag}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.resultColumn}>
                  <span
                    className={
                      item.isCorrect
                        ? styles.correctBadge
                        : styles.incorrectBadge
                    }
                  >
                    {item.isCorrect ? "正解" : "不正解"}
                  </span>
                </div>
                <div className={styles.timeColumn}>
                  {formatTime(item.answerTime)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.tipsContainer}>
          <h2>学習アドバイス</h2>
          <div className={styles.tipCard}>
            <h3>得意分野</h3>
            <p>商品売買の仕訳が得意です。特に掛け取引の理解が進んでいます。</p>
          </div>

          <div className={styles.tipCard}>
            <h3>改善点</h3>
            <p>
              減価償却の仕訳に時間がかかる傾向があります。この分野をもう少し練習しましょう。
            </p>
          </div>
        </div>
      </main>

      <Link href="/" className={styles.backLink}>
        トップページに戻る
      </Link>
    </div>
  );
}

// 日付を「YYYY年MM月DD日」形式にフォーマット
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

// 秒を「〇分〇秒」形式にフォーマット
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    return `${remainingSeconds}秒`;
  }
}
