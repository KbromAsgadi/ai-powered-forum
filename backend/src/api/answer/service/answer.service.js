import { safeExecute } from '../../../../db/config.js';
import { BadRequestError, NotFoundError } from '../../../utils/errors/index.js';

/**
 * Creates an answer for a question, blocking users from answering their own.
 *
 * @param {Object} input
 * @param {number} input.questionId - Target question id.
 * @param {string} input.content - Answer body (min 20 chars).
 * @param {number} input.userId - Authenticated user id.
 * @returns {Promise<Object>} Newly created answer including author info.
 * @throws {NotFoundError} When the question does not exist.
 * @throws {BadRequestError} When the user tries to answer their own question.
 */
export const createAnswerService = async ({ questionId, content, userId }) => {
  const questionSql =
    'SELECT question_id, user_id FROM questions WHERE question_id = ? LIMIT 1';
  const questionRows = await safeExecute(questionSql, [questionId]);

  if (questionRows.length === 0) {
    throw new NotFoundError('Question not found');
  }

  const ownerId = questionRows[0].user_id;
  if (Number(ownerId) === Number(userId)) {
    throw new BadRequestError('You cannot answer your own question');
  }

  const insertSql =
    'INSERT INTO answers (question_id, user_id, content) VALUES (?, ?, ?)';
  const insertResult = await safeExecute(insertSql, [
    questionId,
    userId,
    content,
  ]);
  const answerId = insertResult.insertId;

  const fetchSql = `
    SELECT
      a.answer_id,
      a.question_id,
      a.content,
      a.created_at,
      a.updated_at,
      u.user_id,
      u.first_name,
      u.last_name
    FROM answers a
    JOIN users u ON u.user_id = a.user_id
    WHERE a.answer_id = ?
    LIMIT 1
  `;
  const answerRows = await safeExecute(fetchSql, [answerId]);
  const row = answerRows[0];

  return {
    id: row.answer_id,
    questionId: row.question_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
    },
  };
};