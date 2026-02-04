import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchGoogleBooks, booksApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import type { GoogleBooksVolume, Book } from '../types';

export function BookRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GoogleBooksVolume[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1秒後に検索実行
  const debouncedQuery = useDebounce(searchQuery, 1000);

  // デバウンスされたクエリが変わったら検索
  useEffect(() => {
    // 2文字未満は検索しない
    if (debouncedQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const search = async () => {
      try {
        setIsSearching(true);
        setError(null);
        const result = await searchGoogleBooks(debouncedQuery);
        setSearchResults(result.items || []);
      } catch (e) {
        console.error(e);
        // レート制限エラーの場合は静かに失敗
        if (String(e).includes('429')) {
          setError('検索制限に達しました。しばらく待ってから再度お試しください。');
        }
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const handleRegister = async (volume: GoogleBooksVolume) => {
    if (!user) return;

    try {
      setIsRegistering(true);
      setError(null);
      setSuccessMessage(null);

      const { volumeInfo } = volume;
      const isbn = volumeInfo.industryIdentifiers?.find(
        (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
      )?.identifier || '';

      const bookData: Omit<Book, 'id' | 'createdAt'> = {
        title: volumeInfo.title,
        isbn,
        authors: volumeInfo.authors || [],
        publisher: volumeInfo.publisher || '',
        publishedDate: volumeInfo.publishedDate || '',
        imageUrl: volumeInfo.imageLinks?.thumbnail || '',
        googleBooksId: volume.id,
        createdBy: user.email,
        genre: '',
        titleKana: '',
      };

      await booksApi.create(bookData);
      setSuccessMessage(`「${volumeInfo.title}」を登録しました。`);

      // 検索結果から削除
      setSearchResults((prev) => prev.filter((v) => v.id !== volume.id));
    } catch (e) {
      setError('登録に失敗しました。');
      console.error(e);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="book-register-page">
      <h1>書籍登録</h1>

      <div className="search-form">
        <input
          type="text"
          placeholder="書籍タイトルを入力（2文字以上）"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {isSearching && <span className="searching-indicator">検索中...</span>}
      </div>

      <div className="register-actions">
        <button
          onClick={() => navigate('/register/csv')}
          className="btn btn-secondary"
        >
          CSV一括登録
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}

      {searchResults.length > 0 && (
        <div className="search-results">
          <h2>検索結果</h2>
          <ul className="result-list">
            {searchResults.map((volume) => (
              <li key={volume.id} className="result-item">
                <div className="result-image">
                  {volume.volumeInfo.imageLinks?.thumbnail ? (
                    <img
                      src={volume.volumeInfo.imageLinks.thumbnail}
                      alt={volume.volumeInfo.title}
                    />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}
                </div>
                <div className="result-info">
                  <h3>{volume.volumeInfo.title}</h3>
                  <p>{volume.volumeInfo.authors?.join(', ') || '著者不明'}</p>
                  <p>{volume.volumeInfo.publisher || ''}</p>
                </div>
                <button
                  onClick={() => handleRegister(volume)}
                  disabled={isRegistering}
                  className="btn btn-primary"
                >
                  登録
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
