// import OpenAI from "openai";

// // OpenAIクライアントの初期化
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// /**
//  * 簿記3級レベルの仕訳問題を生成する
//  */
// export async function generateBookkeepingProblem() {
//   try {
//     const response = await openai.chat.completions.create({
//       model: "gpt-4.1",
//       messages: [
//         {
//           role: "system",
//           content: `あなたは簿記3級の問題を作成する専門家です。仕訳問題に特化した問題を作成してください。
//             - 問題は簿記3級レベルの難易度にしてください
//             - 問題は取引の文章形式で出題してください
//             - 複数の取引を含む問題が望ましいです`,
//         },
//         {
//           role: "user",
//           content:
//             "簿記3級の仕訳問題を1つ作成してください。JSONフォーマットで返してください。",
//         },
//       ],
//       response_format: { type: "json_object" },
//     });

//     // レスポンスのパース
//     const content = response.choices[0].message.content;
//     if (!content) {
//       throw new Error("OpenAI APIからの応答が空です");
//     }

//     return JSON.parse(content);
//   } catch (error) {
//     console.error("問題生成エラー:", error);
//     throw error;
//   }
// }

// /**
//  * 解答を評価する
//  * @param problem 問題
//  * @param userAnswer ユーザーの回答
//  */
// export async function evaluateAnswer(problem: any, userAnswer: any) {
//   try {
//     const response = await openai.chat.completions.create({
//       model: "gpt-4.1",
//       messages: [
//         {
//           role: "system",
//           content: `あなたは簿記3級の解答を評価する専門家です。ユーザーの解答を評価し、解説と正解を提供してください。
//             評価結果はJSONフォーマットで返してください。以下の項目を含めてください：
//             - isCorrect: 正解かどうか（boolean）
//             - explanation: 解説文
//             - correctAnswer: 正しい解答（配列形式）`,
//         },
//         {
//           role: "user",
//           content: `問題: ${JSON.stringify(problem)}
//                    ユーザーの解答: ${JSON.stringify(userAnswer)}`,
//         },
//       ],
//       response_format: { type: "json_object" },
//     });

//     // レスポンスのパース
//     const content = response.choices[0].message.content;
//     if (!content) {
//       throw new Error("OpenAI APIからの応答が空です");
//     }

//     return JSON.parse(content);
//   } catch (error) {
//     console.error("解答評価エラー:", error);
//     throw error;
//   }
// }

// /**
//  * 学習計画を生成する
//  * @param userData ユーザーデータ
//  */
// export async function generateStudyPlan(userData: any) {
//   try {
//     const response = await openai.chat.completions.create({
//       model: "gpt-4.1",
//       messages: [
//         {
//           role: "system",
//           content: `あなたは簿記3級の学習計画を作成する専門家です。ユーザーの進捗状況に基づいて、最適な学習計画を作成してください。`,
//         },
//         {
//           role: "user",
//           content: `ユーザーの学習データ: ${JSON.stringify(userData)}`,
//         },
//       ],
//       response_format: { type: "json_object" },
//     });

//     // レスポンスのパース
//     const content = response.choices[0].message.content;
//     if (!content) {
//       throw new Error("OpenAI APIからの応答が空です");
//     }

//     return JSON.parse(content);
//   } catch (error) {
//     console.error("学習計画生成エラー:", error);
//     throw error;
//   }
// }

// export default {
//   generateBookkeepingProblem,
//   evaluateAnswer,
//   generateStudyPlan,
// };
