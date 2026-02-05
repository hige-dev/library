import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingSpinner, StarRating } from '../components';
import { booksApi, loansApi, reviewsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../config';
import type { Book, Loan, Review } from '../types';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [currentLoan, setCurrentLoan] = useState<Loan | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // レビューフォーム状態
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [bookData, loanData] = await Promise.all([
          booksApi.getById(id),
          loansApi.getByBookId(id),
        ]);
        if (!bookData) {
          setError('書籍が見つかりません。');
          return;
        }
        setBook(bookData);
        setCurrentLoan(loanData);

        // レビューは別途取得（エラーでも書籍情報は表示）
        try {
          const [reviewsData, myReviewData] = await Promise.all([
            reviewsApi.getByBookId(id),
            reviewsApi.getMyReview(id),
          ]);
          setReviews(reviewsData);
          setMyReview(myReviewData);
          if (myReviewData) {
            setReviewRating(myReviewData.rating);
            setReviewComment(myReviewData.comment);
          }
        } catch (reviewError) {
          console.error('レビューの取得に失敗:', reviewError);
        }
      } catch (e) {
        setError('データの取得に失敗しました。');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleBorrow = async () => {
    if (!book || !user) return;
    try {
      setIsProcessing(true);
      const loan = await loansApi.borrow(book.id);
      setCurrentLoan(loan);
    } catch (e) {
      setError('貸出処理に失敗しました。');
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturn = async () => {
    if (!currentLoan) return;
    try {
      setIsProcessing(true);
      await loansApi.return(currentLoan.id);
      setCurrentLoan(null);
    } catch (e) {
      setError('返却処理に失敗しました。');
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!book) return;
    if (!window.confirm('この書籍を削除しますか？')) return;
    try {
      setIsProcessing(true);
      await booksApi.delete(book.id);
      navigate('/');
    } catch (e) {
      setError('削除処理に失敗しました。');
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book || reviewRating === 0) return;
    try {
      setIsSubmittingReview(true);
      const review = await reviewsApi.createOrUpdate({
        bookId: book.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      setMyReview(review);
      // レビュー一覧を更新
      setReviews((prev) => {
        const filtered = prev.filter((r) => r.id !== review.id);
        return [review, ...filtered];
      });
    } catch (e) {
      setError('レビューの投稿に失敗しました。');
      console.error(e);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReviewDelete = async () => {
    if (!myReview) return;
    if (!window.confirm('レビューを削除しますか？')) return;
    try {
      setIsSubmittingReview(true);
      await reviewsApi.delete(myReview.id);
      setReviews((prev) => prev.filter((r) => r.id !== myReview.id));
      setMyReview(null);
      setReviewRating(0);
      setReviewComment('');
    } catch (e) {
      setError('レビューの削除に失敗しました。');
      console.error(e);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // 平均評価を計算
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // 他のユーザーのレビュー（自分のレビューを除外）
  const otherReviews = reviews.filter((r) => r.createdBy !== user?.email);

  if (isLoading) {
    return <LoadingSpinner message="書籍情報を読み込み中..." />;
  }

  if (error || !book) {
    return <div className="error-message">{error || '書籍が見つかりません。'}</div>;
  }

  const isOnLoan = currentLoan !== null;
  const isBorrowedByMe = currentLoan?.borrower === user?.email;

  return (
    <div className="book-detail-page">
      <button onClick={() => navigate(-1)} className="back-button">
        ← 戻る
      </button>

      <div className="book-detail">
        <div className="book-detail-image">
          <img
            src={getImageUrl(book.imageUrl)}
            alt={book.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/no-image.svg';
            }}
          />
        </div>

        <div className="book-detail-info">
          <h1>{book.title}</h1>
          <dl>
            <dt>著者</dt>
            <dd>{book.authors.join(', ')}</dd>

            <dt>出版社</dt>
            <dd>{book.publisher || '-'}</dd>

            <dt>出版日</dt>
            <dd>{book.publishedDate || '-'}</dd>

            <dt>ISBN</dt>
            <dd>{book.isbn || '-'}</dd>

            {book.genre && (
              <>
                <dt>ジャンル</dt>
                <dd>{book.genre}</dd>
              </>
            )}

            <dt>貸出状況</dt>
            <dd>
              {isOnLoan ? (
                <span className="status-on-loan">
                  貸出中（{currentLoan.borrower}）
                </span>
              ) : (
                <span className="status-available">貸出可能</span>
              )}
            </dd>
          </dl>

          <div className="book-actions">
            {!isOnLoan && (
              <button
                onClick={handleBorrow}
                disabled={isProcessing}
                className="btn btn-primary"
              >
                借りる
              </button>
            )}

            {isBorrowedByMe && (
              <button
                onClick={handleReturn}
                disabled={isProcessing}
                className="btn btn-success"
              >
                返却する
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={isProcessing || isOnLoan}
              className="btn btn-danger"
            >
              削除
            </button>
          </div>
        </div>
      </div>

      {/* レビューセクション */}
      <div className="reviews-section">
        <h2>レビュー</h2>

        {reviews.length > 0 && (
          <div className="average-rating">
            <StarRating rating={Math.round(averageRating)} readonly size="medium" />
            <span className="average-rating-text">
              {averageRating.toFixed(1)} ({reviews.length}件)
            </span>
          </div>
        )}

        {/* レビュー投稿フォーム */}
        <div className="review-form-container">
          <h3>{myReview ? 'あなたのレビューを編集' : 'レビューを投稿'}</h3>
          <form onSubmit={handleReviewSubmit} className="review-form">
            <div className="form-group">
              <label>評価</label>
              <StarRating
                rating={reviewRating}
                onChange={setReviewRating}
                size="large"
              />
            </div>
            <div className="form-group">
              <label htmlFor="review-comment">コメント</label>
              <textarea
                id="review-comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="この本の感想を書いてください..."
                rows={4}
              />
            </div>
            <div className="form-actions">
              <button
                type="submit"
                disabled={isSubmittingReview || reviewRating === 0}
                className="btn btn-primary"
              >
                {myReview ? '更新する' : '投稿する'}
              </button>
              {myReview && (
                <button
                  type="button"
                  onClick={handleReviewDelete}
                  disabled={isSubmittingReview}
                  className="btn btn-danger"
                >
                  削除
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 他のユーザーのレビュー一覧 */}
        {otherReviews.length > 0 && (
          <div className="reviews-list">
            <h3>他のユーザーのレビュー</h3>
            {otherReviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <StarRating rating={review.rating} readonly size="small" />
                  <span className="review-author">{review.createdBy}</span>
                  <span className="review-date">
                    {new Date(review.updatedAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                {review.comment && (
                  <p className="review-comment">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {reviews.length === 0 && (
          <p className="no-reviews">まだレビューはありません。</p>
        )}
      </div>
    </div>
  );
}
