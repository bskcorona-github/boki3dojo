import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import styles from "../styles/StudyPlan.module.css";

// 学習計画の型定義
interface StudyDay {
  date: string;
  minutes: number;
  topics: string[];
  completed: boolean;
}

// 学習計画ページ
export default function StudyPlan() {
  const [loading, setLoading] = useState(true);
  const [studyPlan, setStudyPlan] = useState<StudyDay[]>([]);
  const [progress, setProgress] = useState(0);

  // ダミーデータを使用して学習計画を設定
  useEffect(() => {
    // 本番では実際のAPIからデータを取得
    const fetchStudyPlan = async () => {
      try {
        setLoading(true);
        // API呼び出しのシミュレーション
        setTimeout(() => {
          // ダミーデータ
          const today = new Date();
          const dummyPlan = Array.from({ length: 14 }, (_, i) => {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            return {
              date: date.toISOString().split("T")[0],
              minutes: 30 + Math.floor(Math.random() * 30),
              topics: [
                "仕訳の基本",
                "資産・負債の記帳",
                "収益・費用の記帳",
                "現金取引",
                "掛取引",
              ]
                .sort(() => 0.5 - Math.random())
                .slice(0, 1 + Math.floor(Math.random() * 3)),
              completed: i === 0 ? true : false,
            };
          });
          setStudyPlan(dummyPlan);
          setProgress(7); // 進捗率（%）
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("学習計画取得エラー:", error);
        setLoading(false);
      }
    };

    fetchStudyPlan();
  }, []);

  // 学習を完了としてマーク
  const markAsCompleted = (date: string) => {
    setStudyPlan(
      studyPlan.map((day) =>
        day.date === date ? { ...day, completed: true } : day
      )
    );
    // 進捗状況の更新
    const completedDays = studyPlan.filter((day) => day.completed).length + 1;
    const newProgress = Math.round((completedDays / studyPlan.length) * 100);
    setProgress(newProgress);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>簿記3級道場 - 学習計画</title>
        </Head>
        <main className={styles.main}>
          <h1>学習計画を読み込み中...</h1>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>簿記3級道場 - 学習計画</title>
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>学習計画</h1>

        <div className={styles.progressContainer}>
          <h2>進捗状況</h2>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className={styles.progressText}>{progress}% 完了</p>
        </div>

        <div className={styles.planContainer}>
          <h2>2週間プラン</h2>

          <div className={styles.planGrid}>
            {studyPlan.map((day) => (
              <div
                key={day.date}
                className={`${styles.dayCard} ${
                  day.completed ? styles.completed : ""
                }`}
              >
                <div className={styles.dateHeader}>
                  <h3>{formatDate(day.date)}</h3>
                  <span className={styles.minutes}>{day.minutes}分</span>
                </div>

                <div className={styles.topicList}>
                  <h4>学習内容:</h4>
                  <ul>
                    {day.topics.map((topic, i) => (
                      <li key={i}>{topic}</li>
                    ))}
                  </ul>
                </div>

                {!day.completed && (
                  <button
                    className={styles.completeButton}
                    onClick={() => markAsCompleted(day.date)}
                  >
                    完了としてマーク
                  </button>
                )}

                {day.completed && (
                  <div className={styles.completedBadge}>完了</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.motivationSection}>
          <h2>学習のモチベーション</h2>
          <div className={styles.motivationCard}>
            <p>
              <strong>現在の正答率:</strong> 68%
            </p>
            <p>
              <strong>今週の学習目標:</strong>{" "}
              仕入取引と売上取引の仕訳を完璧にマスターする
            </p>
            <p className={styles.motivationMessage}>
              順調に進んでいます！特に商品売買の仕訳で正答率が上がってきました。
              続けて練習することで、さらなる上達が期待できます。
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

// 日付を「MM月DD日（曜日）」形式にフォーマット
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = days[date.getDay()];
  return `${month}月${day}日（${weekday}）`;
}
