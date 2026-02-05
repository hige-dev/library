import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSpinner, StarRating } from '../components';
import { reviewsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../config';
import type { ReviewWithBook } from '../types';

export function ReviewListPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewWithBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const data = await reviewsApi.getAll();
        setReviews(data);
      } catch (e) {
        setError('レビューの取得に失敗しました。');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredReviews = useMemo(() => {
    if (filter === 'mine') {
      return reviews.filter((review) => review.createdBy === user?.email);
    }
    return reviews;
  }, [reviews, filter, user]);

  if (isLoading) {
    return <LoadingSpinner message="レビューを読み込み中..." />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="review-list-page">
      <h1>レビュー一覧</h1>

      <div className="filter-buttons">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          すべて
        </button>
        <button
          className={`filter-btn ${filter === 'mine' ? 'active' : ''}`}
          onClick={() => setFilter('mine')}
        >
          自分のレビュー
        </button>
      </div>

      {filteredReviews.length === 0 ? (
        <p className="no-results">レビューがありません。</p>
      ) : (
        <div className="review-list-items">
          {filteredReviews.map((review) => (
            <div key={review.id} className="review-list-item">
              <Link to={`/books/${review.bookId}`} className="review-book-link">
                <img
                  src={getImageUrl(review.bookImageUrl)}
                  alt={review.bookTitle}
                  className="review-book-thumbnail"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/no-image.svg';
                  }}
                />
              </Link>
              <div className="review-list-content">
                <Link to={`/books/${review.bookId}`} className="review-book-title">
                  {review.bookTitle}
                </Link>
                <div className="review-list-header">
                  <StarRating rating={review.rating} readonly size="small" />
                  <span className="review-list-author">{review.createdBy}</span>
                  <span className="review-list-date">
                    {new Date(review.updatedAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                {review.comment && (
                  <p className="review-list-comment">{review.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
