import { apiClient } from "../core/api.client.js";

/**
 * Posts an answer to a question.
 * @param {number} questionId
 * @param {string} content
 */
async function postAnswer(questionId, content) {
  const response = await apiClient.post("/api/answers", {
    questionId,
    content,
  });
  return response.data;
}

/** Service for answer-related API calls. */
export const answerService = {
  postAnswer,
};
