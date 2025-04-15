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
  category VARCHAR(20) NOT NULL, -- 資産、負債、純資産、収益、費用など
  display_order INT NOT NULL
);

-- 初期データ: 勘定科目
INSERT INTO account_items (name, category, display_order) VALUES
('現金', '資産', 1),
('当座預金', '資産', 2),
('普通預金', '資産', 3),
('定期預金', '資産', 4),
('売掛金', '資産', 5),
('商品', '資産', 6),
('貸付金', '資産', 7),
('建物', '資産', 8),
('備品', '資産', 9),
('買掛金', '負債', 10),
('借入金', '負債', 11),
('資本金', '純資産', 12),
('売上', '収益', 13),
('受取利息', '収益', 14),
('給料', '費用', 15),
('家賃', '費用', 16),
('水道光熱費', '費用', 17),
('通信費', '費用', 18),
('雑費', '費用', 19); 