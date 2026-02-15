import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchGoogleBooks, booksApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import type { GoogleBooksVolume, Book } from '../types';

type RegisterTab = 'search' | 'manual';

/**
 * ISBN形式かどうかを判定（ハイフン除去後に10桁or13桁の数字）
 */
function isIsbnQuery(query: string): boolean {
  const cleaned = query.replace(/[-\s]/g, '');
  return /^\d{9}[\dXx]$/.test(cleaned) || /^\d{13}$/.test(cleaned);
}

export function BookRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<RegisterTab>('search');

  // 検索タブ用
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GoogleBooksVolume[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 手動登録フォーム用
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthors, setManualAuthors] = useState('');
  const [manualIsbn, setManualIsbn] = useState('');
  const [manualPublisher, setManualPublisher] = useState('');
  const [manualPublishedDate, setManualPublishedDate] = useState('');
  const [manualGenre, setManualGenre] = useState('');

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
        // ISBN形式なら isbn: プレフィックスを付与
        const query = isIsbnQuery(debouncedQuery.trim())
          ? `isbn:${debouncedQuery.trim().replace(/[-\s]/g, '')}`
          : debouncedQuery;
        const result = await searchGoogleBooks(query);
        setSearchResults(result.items || []);
      } catch (e) {
        console.error(e);
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

  const handleManualRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manualTitle.trim() || !manualAuthors.trim()) return;

    try {
      setIsRegistering(true);
      setError(null);
      setSuccessMessage(null);

      const bookData: Omit<Book, 'id' | 'createdAt'> = {
        title: manualTitle.trim(),
        isbn: manualIsbn.trim(),
        authors: manualAuthors.split(',').map((a) => a.trim()).filter(Boolean),
        publisher: manualPublisher.trim(),
        publishedDate: manualPublishedDate.trim(),
        imageUrl: '',
        googleBooksId: '',
        createdBy: user.email,
        genre: manualGenre.trim(),
        titleKana: '',
      };

      await booksApi.create(bookData);
      setSuccessMessage(`「${manualTitle.trim()}」を登録しました。`);

      // フォームをリセット
      setManualTitle('');
      setManualAuthors('');
      setManualIsbn('');
      setManualPublisher('');
      setManualPublishedDate('');
      setManualGenre('');
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

      <div className="register-tabs">
        <button
          className={`register-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          検索して登録
        </button>
        <button
          className={`register-tab ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          手動で登録
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}

      {activeTab === 'search' && (
        <>
          <div className="search-form">
            <input
              type="text"
              placeholder="書籍タイトルまたはISBNを入力"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {isSearching && <span className="searching-indicator">検索中...</span>}
          </div>

          <div className="register-actions">
            <button
              onClick={() => navigate('/register/batch')}
              className="btn btn-secondary"
            >
              一括登録
            </button>
          </div>

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
        </>
      )}

      {activeTab === 'manual' && (
        <form onSubmit={handleManualRegister} className="manual-form">
          <div className="form-group">
            <label htmlFor="manual-title">タイトル *</label>
            <input
              id="manual-title"
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="manual-authors">著者 *（カンマ区切りで複数入力可）</label>
            <input
              id="manual-authors"
              type="text"
              value={manualAuthors}
              onChange={(e) => setManualAuthors(e.target.value)}
              placeholder="著者1, 著者2"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="manual-isbn">ISBN</label>
            <input
              id="manual-isbn"
              type="text"
              value={manualIsbn}
              onChange={(e) => setManualIsbn(e.target.value)}
              placeholder="978-4-XXXX-XXXX-X"
            />
          </div>
          <div className="form-group">
            <label htmlFor="manual-publisher">出版社</label>
            <input
              id="manual-publisher"
              type="text"
              value={manualPublisher}
              onChange={(e) => setManualPublisher(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="manual-date">出版日</label>
            <input
              id="manual-date"
              type="text"
              value={manualPublishedDate}
              onChange={(e) => setManualPublishedDate(e.target.value)}
              placeholder="2024-01-01"
            />
          </div>
          <div className="form-group">
            <label htmlFor="manual-genre">ジャンル</label>
            <input
              id="manual-genre"
              type="text"
              value={manualGenre}
              onChange={(e) => setManualGenre(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isRegistering || !manualTitle.trim() || !manualAuthors.trim()}
            className="btn btn-primary"
          >
            登録する
          </button>
        </form>
      )}
    </div>
  );
}
