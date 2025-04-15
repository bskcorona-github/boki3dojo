import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>簿記3級道場 - 仕訳トレーニング</title>
        <meta
          name="description"
          content="簿記3級の仕訳問題に特化した学習アプリです"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          簿記3級道場 <span className={styles.highlight}>仕訳トレーニング</span>
        </h1>

        <p className={styles.description}>
          簿記3級の仕訳問題に特化した学習アプリです。
          <br />
          AIが問題生成・解答解説・学習プランの策定まで行います。
        </p>

        <div className={styles.grid}>
          <Link href="/problem" className={styles.card}>
            <h2>問題に挑戦 &rarr;</h2>
            <p>AIが生成した仕訳問題にチャレンジしましょう。</p>
          </Link>

          <Link href="/study-plan" className={styles.card}>
            <h2>学習計画 &rarr;</h2>
            <p>あなたの進捗に合わせた学習計画を確認できます。</p>
          </Link>

          <Link href="/history" className={styles.card}>
            <h2>学習履歴 &rarr;</h2>
            <p>これまでの成績や進捗状況を確認できます。</p>
          </Link>

          <Link href="/account" className={styles.card}>
            <h2>アカウント &rarr;</h2>
            <p>ログインやアカウント設定を行います。</p>
          </Link>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>簿記3級道場 - 仕訳トレーニング</p>
      </footer>
    </div>
  );
}
