/**
 * Dashboard: the logged-in home feed. Search is URL-driven from the Navbar —
 * `?q=term` (keyword) or `?semantic=term` (AI similarity).
 */
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  PenSquare,
  SearchCheck,
  Sparkles,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { questionService } from "../../services/question/question.service.js";
import { getErrorMessage } from "../../lib/utils";
import QuestionCard from "../../components/QuestionCard/QuestionCard.jsx";
import ui from "../../styles/pageStates.module.css";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const keyword = searchParams.get("q") || "";
  const semantic = searchParams.get("semantic") || "";

  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let result;
        if (semantic) {
          result = await questionService.searchQuestionsSemantic(semantic);
        } else if (keyword) {
          result = await questionService.getQuestions({ search: keyword });
        } else {
          result = await questionService.getQuestions();
        }
        if (mounted) setQuestions(result.data || []);
      } catch (err) {
        if (mounted)
          setError(getErrorMessage(err, "Failed to load questions."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [keyword, semantic]);

  const firstName = user?.firstName?.trim();
  const welcomeLine = firstName
    ? `Good to see you, ${firstName}.`
    : "Welcome to the forum.";

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <div>
          <h3 className={styles.dashboardTitle}>{welcomeLine}</h3>
          <p className={styles.dashboardSubtitle}>
            {semantic
              ? `AI similarity results for “${semantic}”`
              : keyword
                ? `Keyword results for “${keyword}”`
                : "Latest questions from the community."}
          </p>
        </div>
        <button
          type="button"
          className={styles.dashboardAsk}
          onClick={() => navigate("/questions/ask")}
        >
          <PenSquare size={16} aria-hidden />
          Ask a question
        </button>
      </div>

      {semantic && !isLoading && !error && (
        <div className={styles.dashboardSearchBadge}>
          <Sparkles size={14} aria-hidden />
          Semantic search uses question embeddings to find “questions like
          this”.
        </div>
      )}

      {isLoading && (
        <div
          className={`${ui.pageStates__message} ${ui["pageStates__message--loading"]}`}
          role="status"
        >
          <div className={styles.dashboardSpinner} aria-hidden />
          Loading questions…
        </div>
      )}

      {!isLoading && error && (
        <div
          className={`${ui.pageStates__message} ${ui["pageStates__message--error"]}`}
          role="alert"
        >
          <div className={styles.dashboardErrorInner}>
            <AlertCircle size={18} aria-hidden />
            <span>{error}</span>
          </div>
        </div>
      )}

      {!isLoading && !error && questions.length === 0 && (
        <div
          className={`${ui.pageStates__message} ${ui["pageStates__message--empty"]}`}
        >
          <div className={styles.dashboardEmptyInner}>
            <Inbox size={28} aria-hidden />
            {semantic || keyword ? (
              <>
                <p>No questions matched your search.</p>
                <p className={styles.dashboardEmptyHint}>
                  Try different keywords or run an AI similarity search from the
                  top bar.
                </p>
              </>
            ) : (
              <>
                <p>No questions yet.</p>
                <p className={styles.dashboardEmptyHint}>
                  Be the first to ask something useful!
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {!isLoading && !error && questions.length > 0 && (
        <div className={styles.dashboardList}>
          {questions.map((question, index) => (
            <QuestionCard
              key={question.questionHash || question.id || index}
              question={question}
              showScore={!!semantic}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && (
        <div className={styles.dashboardFooterNote}>
          <SearchCheck size={14} aria-hidden />
          Two search modes are available from the top bar: keyword and AI
          semantic search.
        </div>
      )}
    </div>
  );
}
