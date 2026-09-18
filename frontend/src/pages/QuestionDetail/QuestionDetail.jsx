/**
 * Question Detail: full thread (question + answers), markdown rendering, an
 * answer form (hidden for the author), and the "AI answer fit" coach.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Send,
  Sparkles,
  User,
  Clock,
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  Flag,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { questionService } from '../../services/question/question.service.js';
import { answerService } from '../../services/answer/answer.service.js';
import { timeAgo, isAuthoredByUser, getErrorMessage } from '../../lib/utils';
import RagAnswerBody from '../../components/RagAnswerBody/RagAnswerBody.jsx';
import ui from '../../styles/pageStates.module.css';
import styles from './QuestionDetail.module.css';

const FIT_LEVEL_LABELS = {
  strong: { label: 'Strong fit', className: 'fitStrong' },
  partial: { label: 'Partial fit', className: 'fitPartial' },
  weak: { label: 'Weak fit', className: 'fitWeak' },
};

export default function QuestionDetail() {
  const { questionHash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [answerText, setAnswerText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState(null);
  const [postSuccess, setPostSuccess] = useState(null);

  const [isFitChecking, setIsFitChecking] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  const [fitError, setFitError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await questionService.getSingleQuestion(questionHash);
        if (!mounted) return;
        setQuestion(result.question || null);
        setAnswers(result.answers || []);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load the question.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [questionHash]);

  const isOwnQuestion = isAuthoredByUser(question, user);

  const handleCheckFit = async () => {
    const trimmed = answerText.trim();
    if (trimmed.length < 20) {
      setFitError('Answer must be at least 20 characters before checking fit.');
      return;
    }
    setFitError(null);
    setFitResult(null);
    setIsFitChecking(true);
    try {
      const result = await questionService.assessAnswerFit(questionHash, trimmed);
      setFitResult(result.data);
    } catch (err) {
      setFitError(getErrorMessage(err, 'AI fit check is unavailable right now.'));
    } finally {
      setIsFitChecking(false);
    }
  };

  const handlePostAnswer = async e => {
    e.preventDefault();
    const trimmed = answerText.trim();
    if (trimmed.length < 20) {
      setPostError('Answer must be at least 20 characters long.');
      return;
    }

    setPostError(null);
    setPostSuccess(null);
    setIsPosting(true);
    try {
      const result = await answerService.postAnswer(question.id, trimmed);
      setAnswers(prev => [...prev, result.data]);
      setAnswerText('');
      setPostSuccess('Answer posted successfully.');
      setFitResult(null);
    } catch (err) {
      setPostError(getErrorMessage(err, 'Failed to post the answer.'));
    } finally {
      setIsPosting(false);
    }
  };

  const fitConfig = fitResult ? FIT_LEVEL_LABELS[fitResult.level] || FIT_LEVEL_LABELS.partial : null;

  return (
    <div className={styles.questionDetail}>
      <button
        type='button'
        className={styles.questionDetailBack}
        onClick={() => navigate('/dashboard')}
      >
        <ArrowLeft size={16} aria-hidden />
        Back to questions
      </button>

      {isLoading && (
        <div className={`${ui.pageStates__message} ${ui['pageStates__message--loading']}`} role='status'>
          <div className={styles.questionDetailSpinner} aria-hidden />
          Loading thread…
        </div>
      )}

      {!isLoading && error && (
        <div className={`${ui.pageStates__message} ${ui['pageStates__message--error']}`} role='alert'>
          <div className={styles.questionDetailErrorInner}>
            <AlertCircle size={18} aria-hidden />
            <span>{error}</span>
          </div>
        </div>
      )}

      {!isLoading && !error && question && (
        <>
          <article className={styles.questionDetailCard}>
            <div className={styles.questionDetailHeader}>
              <div className={styles.questionDetailMeta}>
                <span className={styles.questionDetailMetaItem}>
                  <User size={14} aria-hidden />
                  {question.author?.firstName} {question.author?.lastName}
                </span>
                {question.createdAt && (
                  <span className={styles.questionDetailMetaItem}>
                    <Clock size={14} aria-hidden />
                    {timeAgo(question.createdAt)}
                  </span>
                )}
                <span className={styles.questionDetailMetaItem}>
                  <MessageSquare size={14} aria-hidden />
                  {question.answerCount ?? answers.length}{' '}
                  {(question.answerCount ?? answers.length) === 1 ? 'answer' : 'answers'}
                </span>
              </div>

              {isOwnQuestion && (
                <span className={styles.questionDetailOwnBadge}>
                  <Flag size={13} aria-hidden />
                  Your question
                </span>
              )}
            </div>

            <h2 className={styles.questionDetailTitle}>{question.title}</h2>

            <div className={styles.questionDetailBody}>
              <RagAnswerBody>{question.content}</RagAnswerBody>
            </div>
          </article>

          <section className={styles.questionDetailSection}>
            <h3 className={styles.questionDetailSectionTitle}>
              Answers ({answers.length})
            </h3>

            {answers.length === 0 && (
              <div className={`${ui.pageStates__message} ${ui['pageStates__message--empty']}`}>
                <p>No answers yet. If you can help, post the first one below.</p>
              </div>
            )}

            <div className={styles.questionDetailAnswers}>
              {answers.map(answer => (
                <article key={answer.id} className={styles.answerCard}>
                  <div className={styles.answerCardMeta}>
                    <span className={styles.answerCardAuthor}>
                      {answer.author?.firstName} {answer.author?.lastName}
                    </span>
                    {answer.createdAt && (
                      <span className={styles.answerCardTime}>
                        {timeAgo(answer.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className={styles.answerCardBody}>
                    <RagAnswerBody>{answer.content}</RagAnswerBody>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {!isOwnQuestion && (
            <section className={styles.questionDetailSection}>
              <h3 className={styles.questionDetailSectionTitle}>Post an answer</h3>
              <form className={styles.answerForm} onSubmit={handlePostAnswer}>
                <textarea
                  className={styles.answerFormTextarea}
                  placeholder='Write a helpful answer (min 20 characters)… Markdown is supported.'
                  value={answerText}
                  onChange={e => {
                    setAnswerText(e.target.value);
                    setPostError(null);
                    setPostSuccess(null);
                    setFitResult(null);
                  }}
                  rows={7}
                />

                {postError && (
                  <div className={styles.answerFormError} role='alert'>
                    <AlertCircle size={16} aria-hidden />
                    <span>{postError}</span>
                  </div>
                )}

                {postSuccess && (
                  <div className={styles.answerFormSuccess} role='status'>
                    <CheckCircle2 size={16} aria-hidden />
                    <span>{postSuccess}</span>
                  </div>
                )}

                {fitError && (
                  <div className={styles.answerFormError} role='alert'>
                    <AlertCircle size={16} aria-hidden />
                    <span>{fitError}</span>
                  </div>
                )}

                <div className={styles.answerFormActions}>
                  <button
                    type='button'
                    className={styles.answerFormFit}
                    onClick={handleCheckFit}
                    disabled={isFitChecking || isPosting}
                  >
                    {isFitChecking ? (
                      <>
                        <span className={styles.answerFormSpinner} aria-hidden />
                        Checking fit…
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} aria-hidden />
                        Check answer fit
                      </>
                    )}
                  </button>

                  <button
                    type='submit'
                    className={styles.answerFormSubmit}
                    disabled={isPosting || isFitChecking}
                  >
                    {isPosting ? 'Posting…' : 'Post answer'}
                    {!isPosting && <Send size={16} aria-hidden />}
                  </button>
                </div>
              </form>

              {fitResult && fitConfig && (
                <div className={`${styles.fitPanel} ${styles[fitConfig.className]}`} role='status'>
                  <div className={styles.fitPanelHeader}>
                    <Sparkles size={16} aria-hidden />
                    <span className={styles.fitPanelLevel}>{fitConfig.label}</span>
                  </div>
                  {fitResult.note && (
                    <p className={styles.fitPanelNote}>{fitResult.note}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {isOwnQuestion && (
            <div className={`${ui.pageStates__message} ${ui['pageStates__message--empty']}`}>
              <p>This is your question — you can't answer your own thread.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}