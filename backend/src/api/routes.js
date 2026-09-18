import express from "express";
import authRoutes from "./auth/routes/auth.routes.js";
import questionRoutes from "./question/routes/question.routes.js";
import answerRoutes from "./answer/routes/answer.routes.js";
import ragRoutes from "./rag/routes/rag.routes.js";

export const mainRouter = express.Router();

// Authentication routes
mainRouter.use("/auth", authRoutes);

// Questions routes (incl. semantic search / similar / AI coach endpoints)
mainRouter.use("/questions", questionRoutes);

// Answers routes
mainRouter.use("/answers", answerRoutes);

// RAG document routes
mainRouter.use("/rag/documents", ragRoutes);
