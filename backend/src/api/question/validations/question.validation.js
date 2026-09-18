import { body, param, query } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

export const QUESTION_HASH_PATTERN = /^[a-f0-9]{16}$/;

/**
 * POST /api/questions
 */
export const createQuestionValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 5, max: 255 })
    .withMessage("Title must be between 5 and 255 characters long"),
  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isString()
    .withMessage("Content must be a string")
    .isLength({ min: 10 })
    .withMessage("Content must be at least 10 characters long"),

  validationErrorHandler,
];

/**
 * GET /api/questions
 */
export const getQuestionsValidation = [
  query("search").optional().isString().withMessage("Search must be a string"),
  query("mine")
    .optional()
    .custom(
      (value) =>
        value === "true" || value === "false" || value === "1" || value === "0",
    )
    .withMessage("mine must be a boolean (true/false)"),
  validationErrorHandler,
];

/**
 * GET /api/questions/:questionHash
 */
export const getSingleQuestionValidation = [
  param("questionHash")
    .matches(QUESTION_HASH_PATTERN)
    .withMessage("questionHash must be a 16-character lowercase hex string"),
  validationErrorHandler,
];

/**
 * GET /api/questions/search
 */
export const searchQuestionsValidation = [
  query("query")
    .notEmpty()
    .withMessage("query is required")
    .isString()
    .withMessage("query must be a string")
    .isLength({ min: 5 })
    .withMessage("query must be at least 5 characters long"),
  query("k")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("k must be an integer between 1 and 20"),
  query("threshold")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("threshold must be a float between 0 and 1"),
  validationErrorHandler,
];

/**
 * GET /api/questions/:questionHash/similar
 */
export const getSimilarQuestionsValidation = [
  param("questionHash")
    .matches(QUESTION_HASH_PATTERN)
    .withMessage("questionHash must be a 16-character lowercase hex string"),
  query("k")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("k must be an integer between 1 and 20"),
  query("threshold")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("threshold must be a float between 0 and 1"),
  validationErrorHandler,
];

/**
 * POST /api/questions/:questionHash/answer-fit
 */
export const assessAnswerFitValidation = [
  param("questionHash")
    .matches(QUESTION_HASH_PATTERN)
    .withMessage("questionHash must be a 16-character lowercase hex string"),
  body("answerText")
    .notEmpty()
    .withMessage("answerText is required")
    .isString()
    .withMessage("answerText must be a string")
    .isLength({ min: 20 })
    .withMessage("answerText must be at least 20 characters long"),
  validationErrorHandler,
];

/**
 * POST /api/questions/draft-coach
 */
export const generateQuestionDraftCoachValidation = [
  body("title").optional().isString().withMessage("Title must be a string"),
  body("content")
    .notEmpty()
    .withMessage("content is required")
    .isString()
    .withMessage("content must be a string")
    .isLength({ min: 10 })
    .withMessage("content must be at least 10 characters long"),
  validationErrorHandler,
];
