/**
 * Shared question list card used on the Dashboard and My Questions pages.
 * Navigates to `/questions/:questionHash` on click.
 */
import { useNavigate } from 'react-router-dom';
import { MessageSquare, User, Clock, ArrowUpRight } from 'lucide-react';
import { timeAgo } from '../../lib/utils';
import styles from './QuestionCard.module.css';

/**
 * @param {Object} props
 * @param {Object} props.question - Question object from the API.
 * @param {boolean} [props.showScore] - Render the similarity score when present.
 */
export default function QuestionCard({ question, showScore = false }) {
  const navigate = useNavigate();

  if (!question) return null;

  const { questionHash, title, content, answerCount, createdAt, author, score } =
    question;

  const handleClick = () => navigate(`/questions/${questionHash}`);

  return (
    <article
      className={styles.card}
      onClick={handleClick}
      role='link'
      tabIndex={0}
      aria-label={`Open question: ${title}`}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {content && <p className={styles.cardExcerpt}>{content}</p>}

        <div className={styles.cardMeta}>
          <span className={styles.cardMetaItem}>
            <User size={14} aria-hidden />
            {author ? `${author.firstName} ${author.lastName}` : 'Unknown'}
          </span>

          <span className={styles.cardMetaItem}>
            <MessageSquare size={14} aria-hidden />
            {answerCount ?? 0} {Number(answerCount) === 1 ? 'answer' : 'answers'}
          </span>

          {createdAt && (
            <span className={styles.cardMetaItem}>
              <Clock size={14} aria-hidden />
              {timeAgo(createdAt)}
            </span>
          )}

          {showScore && typeof score === 'number' && (
            <span className={styles.cardScore}>
              Similarity {score.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.cardArrow} aria-hidden>
        <ArrowUpRight size={18} />
      </div>
    </article>
  );
}