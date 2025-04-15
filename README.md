# 簿記 3 級道場 (Boki3 Dojo)

簿記 3 級の練習問題を解くための Web アプリケーションです。ユーザーは仕訳問題を解き、正誤判定を受けることができます。

## 機能

- ランダムな簿記 3 級レベルの問題生成
- 仕訳入力と即時採点
- 「回答を見る」機能による学習サポート
- 各問題に適した勘定科目の提案

## 技術スタック

- フロントエンド: Next.js, React
- バックエンド: Node.js (Next.js API Routes)
- データベース: MySQL
- スタイリング: CSS Modules

## セットアップ

1. リポジトリをクローンする

   ```
   git clone https://github.com/bskcorona-github/boki3dojo.git
   cd boki3dojo
   ```

2. 依存関係をインストールする

   ```
   npm install
   ```

3. データベースをセットアップする

   ```
   mysql -u [ユーザー名] -p < db/create_tables.sql
   mysql -u [ユーザー名] -p < db/seed_data.sql
   ```

4. 環境変数を設定する
   `.env.local`ファイルを作成し、以下の内容を記述：

   ```
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=boki3dojo
   ```

5. 開発サーバーを起動する
   ```
   npm run dev
   ```

## ライセンス

MIT
