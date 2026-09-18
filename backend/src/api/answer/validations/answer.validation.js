import { body } from "express-validator";
import { validationErrorHandler } from "../../../middleware/validation-handler.js";

/**
 * POST /api/answers
 */
export const createAnswerValidation = [
  body("questionId")
    .notEmpty()
    .withMessage("questionId is required")
    .isInt({ min: 1 })
    .withMessage("questionId must be a positive integer"),
  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isString()
    .withMessage("Content must be a string")
    .isLength({ min: 20 })
    .withMessage("Content must be at least 20 characters long"),

  validationErrorHandler,
];
