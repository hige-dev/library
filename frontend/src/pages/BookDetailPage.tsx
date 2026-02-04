import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components';
import { booksApi, loansApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../config';
import type { Book, Loan } from '../types';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [currentLoan, setCurrentLoan] = useState<Loan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [booksData, loanData] = await Promise.all([
          booksApi.getAll(),
          loansApi.getByBookId(id),
        ]);
        const foundBook = booksData.find((b) => b.id === id);
        if (!foundBook) {
          setError('書籍が見つかりません。');
          return;
        }
        setBook(foundBook);
        setCurrentLoan(loanData);
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
      const loan = await loansApi.borrow(book.id, user.email);
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
    </div>
  );
}
