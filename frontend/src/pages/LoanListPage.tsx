import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../components';
import { booksApi, loansApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../config';
import type { Book, Loan } from '../types';

interface LoanWithBook extends Loan {
  book: Book | null;
}

export function LoanListPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine' | 'active'>('active');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [booksData, loansData] = await Promise.all([
        booksApi.getAll(),
        loansApi.getAll(),
      ]);
      setBooks(booksData);
      setLoans(loansData);
    } catch (e) {
      setError('データの取得に失敗しました。');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loansWithBooks: LoanWithBook[] = useMemo(() => {
    return loans.map((loan) => ({
      ...loan,
      book: books.find((b) => b.id === loan.bookId) || null,
    }));
  }, [books, loans]);

  const filteredLoans = useMemo(() => {
    switch (filter) {
      case 'mine':
        return loansWithBooks.filter((loan) => loan.borrower === user?.email);
      case 'active':
        return loansWithBooks.filter((loan) => !loan.returnedAt);
      default:
        return loansWithBooks;
    }
  }, [loansWithBooks, filter, user]);

  const handleReturn = async (loanId: string) => {
    try {
      setIsProcessing(true);
      await loansApi.return(loanId);
      await fetchData(); // データを再取得
    } catch (e) {
      setError('返却処理に失敗しました。');
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="貸出状況を読み込み中..." />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="loan-list-page">
      <h1>貸出状況</h1>

      <div className="filter-buttons">
        <button
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          貸出中
        </button>
        <button
          className={`filter-btn ${filter === 'mine' ? 'active' : ''}`}
          onClick={() => setFilter('mine')}
        >
          自分の貸出
        </button>
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          すべて
        </button>
      </div>

      {filteredLoans.length === 0 ? (
        <p className="no-results">該当する貸出がありません。</p>
      ) : (
        <table className="loan-table">
          <thead>
            <tr>
              <th>書籍</th>
              <th>借りた人</th>
              <th>貸出日</th>
              <th>返却日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.map((loan) => (
              <tr key={loan.id} className={loan.returnedAt ? 'returned' : ''}>
                <td className="book-cell">
                  {loan.book ? (
                    <Link to={`/books/${loan.book.id}`} className="book-link">
                      <img
                        src={getImageUrl(loan.book.imageUrl)}
                        alt={loan.book.title}
                        className="book-thumbnail"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/no-image.svg';
                        }}
                      />
                      <span>{loan.book.title}</span>
                    </Link>
                  ) : (
                    <span className="deleted-book">削除された書籍</span>
                  )}
                </td>
                <td>{loan.borrower}</td>
                <td>{new Date(loan.borrowedAt).toLocaleDateString('ja-JP')}</td>
                <td>
                  {loan.returnedAt
                    ? new Date(loan.returnedAt).toLocaleDateString('ja-JP')
                    : '-'}
                </td>
                <td>
                  {!loan.returnedAt && loan.borrower === user?.email && (
                    <button
                      onClick={() => handleReturn(loan.id)}
                      disabled={isProcessing}
                      className="btn btn-sm btn-success"
                    >
                      返却
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
