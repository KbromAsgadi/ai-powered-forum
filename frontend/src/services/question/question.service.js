import { apiClient } from "../core/api.client.js";

/**
 * Fetches questions with optional filters.
 * @param {{ search?: string, mine?: boolean }} [params]
 */
async function getQuestions(params = {}) {
  const response = await apiClient.get("/api/questions", { params });
  return response.data;
}

/**
 * Creates a new question.
 * @param {{ title: string, content: string }} payload
 */
async function createQuestion(payload) {
  const response = await apiClient.post("/api/questions", payload);
  return response.data;
}

/**
 * Fetches a single question by its 16-char hash (includes answers).
 * @param {string} questionHash
 */
async function getSingleQuestion(questionHash) {
  const response = await apiClient.get(`/api/questions/${questionHash}`);
  return response.data;
}

/**
 * Runs semantic (AI similarity) search over questions.
 * @param {string} query
 * @param {{ k?: number, threshold?: number }} [options]
 */
async function searchQuestionsSemantic(query, options = {}) {
  const response = await apiClient.get("/api/questions/search", {
    params: { query, ...options },
  });
  return response.data;
}

/**
 * Finds questions similar to a given one.
 * @param {string} questionHash
 * @param {{ k?: number, threshold?: number }} [options]
 */
async function getSimilarQuestions(questionHash, options = {}) {
  const response = await apiClient.get(
    `/api/questions/${questionHash}/similar`,
    {
      params: options,
    },
  );
  return response.data;
}

/**
 * Runs AI draft coach feedback on a question draft.
 * @param {{ title?: string, content: string }} payload
 */
async function generateQuestionDraftCoach(payload) {
  const response = await apiClient.post("/api/questions/draft-coach", payload, {
    // Generation can be slow under free-tier quota backoff.
    timeout: 120000,
  });
  return response.data;
}

/**
 * Evaluates how well a draft answer fits the question.
 * @param {string} questionHash
 * @param {string} answerText
 */
async function assessAnswerFit(questionHash, answerText) {
  const response = await apiClient.post(
    `/api/questions/${questionHash}/answer-fit`,
    { answerText },
    {
      // Generation can be slow under free-tier quota backoff.
      timeout: 120000,
    },
  );
  return response.data;
}

/** Service for question-related API calls. */
export const questionService = {
  getQuestions,
  createQuestion,
  getSingleQuestion,
  searchQuestionsSemantic,
  getSimilarQuestions,
  generateQuestionDraftCoach,
  assessAnswerFit,
};
