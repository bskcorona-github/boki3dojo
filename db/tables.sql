-- データベースの作成
CREATE DATABASE IF NOT EXISTS boki3dojo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE boki3dojo;

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 問題テーブル
CREATE TABLE IF NOT EXISTS problems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  difficulty TINYINT NOT NULL DEFAULT 1 COMMENT '1: 簡単, 2: 普通, 3: 難しい',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 回答履歴テーブル
CREATE TABLE IF NOT EXISTS answer_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  problem_id INT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  answer_data JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 学習計画テーブル
CREATE TABLE IF NOT EXISTS study_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active, completed, archived',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 勘定科目マスターテーブル
CREATE TABLE IF NOT EXISTS account_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL COMMENT '資産,負債,純資産,収益,費用',
  UNIQUE KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 勘定科目の初期データ投入
INSERT INTO account_items (name, type) VALUES
-- 資産の勘定科目
('現金', '資産'),
('当座預金', '資産'),
('普通預金', '資産'),
('定期預金', '資産'),
('受取手形', '資産'),
('売掛金', '資産'),
('有価証券', '資産'),
('商品', '資産'),
('貯蔵品', '資産'),
('前払金', '資産'),
('前払費用', '資産'),
('未収金', '資産'),
('未収収益', '資産'),
('立替金', '資産'),
('仮払金', '資産'),
('建物', '資産'),
('備品', '資産'),
('車両運搬具', '資産'),
('土地', '資産'),
('電話加入権', '資産'),
('特許権', '資産'),
('営業権', '資産'),

-- 負債の勘定科目
('支払手形', '負債'),
('買掛金', '負債'),
('借入金', '負債'),
('未払金', '負債'),
('未払費用', '負債'),
('前受金', '負債'),
('前受収益', '負債'),
('預り金', '負債'),
('仮受金', '負債'),

-- 純資産の勘定科目
('資本金', '純資産'),
('利益剰余金', '純資産'),

-- 収益の勘定科目
('売上', '収益'),
('受取利息', '収益'),
('受取配当金', '収益'),
('雑収入', '収益'),

-- 費用の勘定科目
('仕入', '費用'),
('給料', '費用'),
('法定福利費', '費用'),
('福利厚生費', '費用'),
('広告宣伝費', '費用'),
('旅費交通費', '費用'),
('通信費', '費用'),
('水道光熱費', '費用'),
('消耗品費', '費用'),
('租税公課', '費用'),
('減価償却費', '費用'),
('修繕費', '費用'),
('保険料', '費用'),
('支払手数料', '費用'),
('支払利息', '費用'),
('雑費', '費用')
ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type); 