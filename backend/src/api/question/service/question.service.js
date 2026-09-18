
import { safeExecute } from '../../../../db/config.js';
import { NotFoundError } from '../../../utils/errors/index.js';
import {
  cosineSimilarity,
  parseEmbedding,
  generateHexHash,
} from '../../../utils/vector.js';
import { embedText } from '../../../services/gemini.service.js';

const RECOMMEND_THRESHOLD = Number(process.env.RECOMMEND_THRESHOLD) || 0.75;
const RECOMMEND_K = Number(process.env.RECOMMEND_K) || 5;
const DEFAULT_ANSWERS_LIMIT = 100;

/**
 * Maps a flat questions JOIN users JOIN answers row to the API question shape.
 */
function mapQuestionRow(row) {
  return {
    id: row.question_id,
    questionHash: row.question_hash,
    title: row.title,
    content: row.content,
    answerCount: Number(row.answerCount) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
    },
  };
}

/**
 * Hydrates question detail rows from a list of question ids, preserving the
 * original order of `ids`.
 *
 * @param {number[]} ids - Question ids to fetch.
 * @returns {Promise<Array>} Mapped question objects (empty when ids is empty).
 */
async function hydrateQuestionDetails(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const sql = `
    SELECT
      q.question_id,
      q.question_hash,
      q.title,
      q.content,
      q.created_at,
      q.updated_at,
      u.user_id,
      u.first_name,
      u.last_name,
      COUNT(a.answer_id) AS answerCount
    FROM questions q
    JOIN users u ON u.user_id = q.user_id
    LEFT JOIN answers a ON a.question_id = q.question_id
    WHERE q.question_id IN (${ids.map(() => '?').join(',')})
    GROUP BY
      q.question_id, q.question_hash, q.title, q.content,
      q.created_at, q.updated_at, u.user_id, u.first_name, u.last_name
  `;

  const rows = await safeExecute(sql, ids);
  const byId = new Map(rows.map(row => [row.question_id, mapQuestionRow(row)]));

  return ids.map(id => byId.get(id)).filter(Boolean);
}

/**
 * Creates a question and (best-effort) stores its vector embedding.
 *
 * @param {Object} input
 * @param {string} input.title - Question title.
 * @param {string} input.content - Question body.
 * @param {number} input.userId - Authenticated user id.
 * @returns {Promise<Object>} Question summary with the generated hash.
 */
export const createQuestionWithVectorService = async ({ title, content, userId }) => {
  const questionHash = generateHexHash(16);

  const insertSql =
    'INSERT INTO questions (question_hash, user_id, title, content) VALUES (?, ?, ?, ?)';
  const insertResult = await safeExecute(insertSql, [
    questionHash,
    userId,
    title,
    content,
  ]);
  const questionId = insertResult.insertId;

  const sourceText = `${title}\n\n${content}`;

  try {
    const vector = await embedText(sourceText, 'RETRIEVAL_DOCUMENT');
    const vectorSql =
      'INSERT INTO question_vectors (question_id, source_text, embedding, status) VALUES (?, ?, ?, ?)';
    await safeExecute(vectorSql, [
      questionId,
      sourceText,
      JSON.stringify(vector),
      'ready',
    ]);
  } catch (_error) {
    // Embedding failure should not block question creation; record it instead.
    const vectorSql =
      'INSERT INTO question_vectors (question_id, source_text, embedding, status) VALUES (?, ?, ?, ?)';
    await safeExecute(vectorSql, [
      questionId,
      sourceText,
      JSON.stringify([]),
      'failed',
    ]);
  }

  return { id: questionId, questionHash, title, content, userId };
};

/**
 * Lists questions with optional keyword (`search`) and ownership (`mine`) filters.
 *
 * @param {Object} input
 * @param {string} [input.search] - LIKE filter over title/content.
 * @param {string} [input.mine] - 'true' filters to the authenticated user.
 * @param {number} input.userId - Authenticated user id.
 * @returns {Promise<Object>} `{ data, meta }`.
 */
export const getQuestionsService = async ({ search, mine, userId }) => {
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push('(q.title LIKE ? OR q.content LIKE ?)');
    params.push(term, term);
  }

  if (mine === 'true' || mine === '1' || mine === true) {
    conditions.push('q.user_id = ?');
    params.push(userId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      q.question_id,
      q.question_hash,
      q.title,
      q.content,
      q.created_at,
      q.updated_at,
      u.user_id,
      u.first_name,
      u.last_name,
      COUNT(a.answer_id) AS answerCount
    FROM questions q
    JOIN users u ON u.user_id = q.user_id
    LEFT JOIN answers a ON a.question_id = q.question_id
    ${whereClause}
    GROUP BY
      q.question_id, q.question_hash, q.title, q.content,
      q.created_at, q.updated_at, u.user_id, u.first_name, u.last_name
    ORDER BY q.created_at DESC
  `;

  const rows = await safeExecute(sql, params);

  return {
    data: rows.map(mapQuestionRow),
    meta: {
      limit: DEFAULT_ANSWERS_LIMIT,
      total: rows.length,
      sortBy: 'newest',
      sortOrder: 'desc',
    },
  };
};

/**
 * Fetches a single question with its answers.
 *
 * @param {string} questionHash - 16-char hex hash.
 * @returns {Promise<Object>} `{ question, answers, answersMeta }`.
 * @throws {NotFoundError} When the question does not exist.
 */
export const getSingleQuestionService = async questionHash => {
  const questionSql = `
    SELECT
      q.question_id,
      q.question_hash,
      q.title,
      q.content,
      q.created_at,
      q.updated_at,
      u.user_id,
      u.first_name,
      u.last_name
    FROM questions q
    JOIN users u ON u.user_id = q.user_id
    WHERE q.question_hash = ?
    LIMIT 1
  `;

  const questionRows = await safeExecute(questionSql, [questionHash]);

  if (questionRows.length === 0) {
    throw new NotFoundError('Question not found');
  }

  const questionRow = questionRows[0];

  const answersSql = `
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
    WHERE a.question_id = ?
    ORDER BY a.created_at ASC
  `;

  const answerRows = await safeExecute(answersSql, [questionRow.question_id]);

  const answers = answerRows.map(row => ({
    id: row.answer_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
    },
  }));

  return {
    question: {
      id: questionRow.question_id,
      questionHash: questionRow.question_hash,
      title: questionRow.title,
      content: questionRow.content,
      answerCount: answers.length,
      createdAt: questionRow.created_at,
      updatedAt: questionRow.updated_at,
      author: {
        id: questionRow.user_id,
        firstName: questionRow.first_name,
        lastName: questionRow.last_name,
      },
    },
    answers,
    answersMeta: {
      limit: DEFAULT_ANSWERS_LIMIT,
      total: answers.length,
    },
  };
};

/**
 * Performs semantic search over stored question embeddings.
 *
 * @param {Object} input
 * @param {string} input.query - Search text (min 5 chars).
 * @param {number} [input.k] - Max results.
 * @param {number} [input.threshold] - Minimum cosine score.
 * @returns {Promise<Object>} `{ data, meta }`.
 */
export const searchQuestionsSemanticService = async ({
  query,
  k = RECOMMEND_K,
  threshold = RECOMMEND_THRESHOLD,
}) => {
  const queryVector = await embedText(query, 'RETRIEVAL_QUERY');

  const vectorSql =
    "SELECT question_id, embedding FROM question_vectors WHERE status = 'ready'";
  const vectorRows = await safeExecute(vectorSql, []);

  const scored = vectorRows
    .map(row => ({
      questionId: row.question_id,
      score: cosineSimilarity(queryVector, parseEmbedding(row.embedding)),
    }))
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  const data = await hydrateQuestionDetails(scored.map(item => item.questionId));

  return {
    data: data.map((question, index) => ({
      ...question,
      score: scored[index]?.score ?? 0,
    })),
    meta: {
      total: data.length,
      k,
      threshold,
      query,
      questionHash: null,
    },
  };
};

/**
 * Finds questions similar to the given one using its stored embedding.
 *
 * @param {Object} input
 * @param {string} input.questionHash - Source question hash.
 * @param {number} [input.k] - Max results.
 * @param {number} [input.threshold] - Minimum cosine score.
 * @returns {Promise<Object>} `{ data, meta }`.
 * @throws {NotFoundError} When the source question does not exist.
 */
export const getSimilarQuestionsService = async ({
  questionHash,
  k = RECOMMEND_K,
  threshold = RECOMMEND_THRESHOLD,
}) => {
  const sourceSql = `
    SELECT q.question_id, qv.embedding
    FROM questions q
    JOIN question_vectors qv ON qv.question_id = q.question_id
    WHERE q.question_hash = ?
    LIMIT 1
  `;
  const sourceRows = await safeExecute(sourceSql, [questionHash]);

  if (sourceRows.length === 0) {
    throw new NotFoundError('Question not found');
  }

  const sourceId = sourceRows[0].question_id;
  const sourceVector = parseEmbedding(sourceRows[0].embedding);

  if (sourceVector.length === 0) {
    return { data: [], meta: { total: 0, k, threshold, query: null, questionHash } };
  }

  const vectorSql =
    "SELECT question_id, embedding FROM question_vectors WHERE status = 'ready' AND question_id <> ?";
  const vectorRows = await safeExecute(vectorSql, [sourceId]);

  const scored = vectorRows
    .map(row => ({
      questionId: row.question_id,
      score: cosineSimilarity(sourceVector, parseEmbedding(row.embedding)),
    }))
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  const data = await hydrateQuestionDetails(scored.map(item => item.questionId));

  return {
    data: data.map((question, index) => ({
      ...question,
      score: scored[index]?.score ?? 0,
    })),
    meta: {
      total: data.length,
      k,
      threshold,
      query: null,
      questionHash,
    },
  };
};