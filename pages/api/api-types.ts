import { RowDataPacket, ResultSetHeader as MySQLResultSetHeader } from "mysql2";

// ResultSetHeaderをエクスポート
export type ResultSetHeader = MySQLResultSetHeader;

// データベースから取得する問題の型定義
export interface Problem extends RowDataPacket {
  id: number;
  title: string;
  content: string;
  difficulty: number;
  created_at: Date;
  created_by?: number | null;
}

// ユーザーの回答データの型定義
export interface UserAnswer {
  problemId: number;
  userId?: number;
  journalEntries: JournalEntry[];
  answerTime?: number;
}

// 仕訳エントリーの型定義
export interface JournalEntry {
  id?: number;
  debitAccount: string;
  debitAmount: number;
  creditAccount: string;
  creditAmount: number;
}

// 回答チェック結果の型定義
export interface CheckResult {
  isCorrect: boolean;
  explanation: string;
  correctAnswer?: JournalEntry[];
}

// 勘定科目の型定義
export interface AccountItem extends RowDataPacket {
  id: number;
  name: string;
  type: string;
  category?: string;
  display_order?: number;
}

// データベースクエリ結果の型定義
export type QueryResult =
  | RowDataPacket[]
  | RowDataPacket[][]
  | ResultSetHeader
  | ResultSetHeader[]
  | null;
