-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 問題テーブル
CREATE TABLE IF NOT EXISTS problems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  difficulty INT NOT NULL DEFAULT 1, -- 1: 初級, 2: 中級, 3: 上級
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 回答履歴テーブル
CREATE TABLE IF NOT EXISTS answer_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  problem_id INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answer_data JSON NOT NULL, -- 回答データ（JSON形式）
  answer_time INT NOT NULL, -- 解答にかかった時間（秒）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (problem_id) REFERENCES problems(id)
);

-- 学習スケジュールテーブル
CREATE TABLE IF NOT EXISTS study_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  target_date DATE NOT NULL,
  planned_minutes INT NOT NULL,
  actual_minutes INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 勘定科目マスターテーブル
CREATE TABLE IF NOT EXISTS account_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL, -- 資産、負債、純資産、収益、費用など
  display_order INT NOT NULL
); 