import { useState, useEffect, useMemo } from 'react';
import { BookCard, LoadingSpinner } from '../components';
import { booksApi, loansApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Book, Loan, BookWithLoan } from '../types';

type FilterType = 'all' | 'available' | 'onLoan';

export function BookListPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const [booksData, loansData] = await Promise.all([
        booksApi.getAll(),
        loansApi.getAll(),
      ]);
      setBooks(booksData);
      setLoans(loansData);
      setError(null);
    } catch (e) {
      setError('データの取得に失敗しました。');
      console.error(e);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 書籍と貸出情報を結合
  const booksWithLoans: BookWithLoan[] = useMemo(() => {
    return books.map((book) => {
      const currentLoan = loans.find(
        (loan) => loan.bookId === book.id && !loan.returnedAt
      ) || null;
      return { ...book, currentLoan };
    });
  }, [books, loans]);

  // ジャンル一覧を取得
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    books.forEach((book) => {
      if (book.genre) {
        genreSet.add(book.genre);
      }
    });
    return Array.from(genreSet).sort();
  }, [books]);

  // フィルタリング
  const filteredBooks = useMemo(() => {
    let result = booksWithLoans;

    // 貸出状況フィルター
    if (filter === 'available') {
      result = result.filter((book) => !book.currentLoan);
    } else if (filter === 'onLoan') {
      result = result.filter((book) => book.currentLoan);
    }

    // ジャンルフィルター
    if (genreFilter) {
      result = result.filter((book) => book.genre === genreFilter);
    }

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.authors.some((author) => author.toLowerCase().includes(query)) ||
          book.isbn.includes(query)
      );
    }

    return result;
  }, [booksWithLoans, searchQuery, filter, genreFilter]);

  const handleBorrow = async (bookId: string) => {
    if (!user) return;
    try {
      await loansApi.borrow(bookId);
      await fetchData(false);
    } catch (e) {
      console.error(e);
      alert('貸出に失敗しました。');
    }
  };

  const handleReturn = async (loanId: string) => {
    try {
      await loansApi.return(loanId);
      await fetchData(false);
    } catch (e) {
      console.error(e);
      alert('返却に失敗しました。');
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="書籍一覧を読み込み中..." />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  const availableCount = booksWithLoans.filter((b) => !b.currentLoan).length;
  const onLoanCount = booksWithLoans.filter((b) => b.currentLoan).length;

  return (
    <div className="book-list-page">
      <div className="list-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="書籍を検索（タイトル、著者、ISBN）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            すべて ({booksWithLoans.length})
          </button>
          <button
            className={`filter-btn ${filter === 'available' ? 'active' : ''}`}
            onClick={() => setFilter('available')}
          >
            貸出可 ({availableCount})
          </button>
          <button
            className={`filter-btn ${filter === 'onLoan' ? 'active' : ''}`}
            onClick={() => setFilter('onLoan')}
          >
            貸出中 ({onLoanCount})
          </button>
        </div>

        {genres.length > 0 && (
          <div className="genre-filter">
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="genre-select"
            >
              <option value="">ジャンル: すべて</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filteredBooks.length === 0 ? (
        <p className="no-results">
          {searchQuery ? '検索結果がありません。' : '該当する書籍がありません。'}
        </p>
      ) : (
        <div className="book-grid">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              currentUserEmail={user?.email}
              onBorrow={() => handleBorrow(book.id)}
              onReturn={() => book.currentLoan && handleReturn(book.currentLoan.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
