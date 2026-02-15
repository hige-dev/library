import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchGoogleBooks, booksApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components';
import type { Book } from '../types';

/**
 * ISBN形式かどうかを判定（ハイフン除去後に10桁or13桁の数字、ISBN-10末尾X対応）
 */
function isIsbnQuery(query: string): boolean {
  const cleaned = query.replace(/[-\s]/g, '');
  return /^\d{9}[\dXx]$/.test(cleaned) || /^\d{13}$/.test(cleaned);
}

interface RegisterResult {
  title: string;
  status: 'success' | 'error' | 'not_found';
  message?: string;
}

export function BatchRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<RegisterResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const titles = inputText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (titles.length === 0) {
      setError('登録する書籍タイトルを入力してください。');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: titles.length });

    const registerResults: RegisterResult[] = [];
    const booksToRegister: Array<Omit<Book, 'id' | 'createdAt'>> = [];

    // 各タイトルを検索して書籍情報を収集
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      setProgress({ current: i + 1, total: titles.length });

      try {
        // ISBN形式なら isbn: プレフィックスを付与して精度向上
        const query = isIsbnQuery(title)
          ? `isbn:${title.replace(/[-\s]/g, '')}`
          : title;
        const searchResult = await searchGoogleBooks(query);

        if (!searchResult.items || searchResult.items.length === 0) {
          registerResults.push({
            title,
            status: 'not_found',
            message: '書籍が見つかりませんでした',
          });
          continue;
        }

        // 最初の検索結果を使用
        const volume = searchResult.items[0];
        const { volumeInfo } = volume;
        const isbn = volumeInfo.industryIdentifiers?.find(
          (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
        )?.identifier || '';

        booksToRegister.push({
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
        });

        registerResults.push({
          title: volumeInfo.title,
          status: 'success',
        });
      } catch (e) {
        console.error(`Failed to search: ${title}`, e);
        registerResults.push({
          title,
          status: 'error',
          message: '検索に失敗しました',
        });
      }

      // API制限対策のため少し待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 一括登録
    if (booksToRegister.length > 0) {
      try {
        await booksApi.createBatch(booksToRegister);
      } catch (e) {
        console.error('Failed to register books', e);
        setError('一括登録に失敗しました。');
      }
    }

    setResults(registerResults);
    setIsProcessing(false);
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const notFoundCount = results.filter((r) => r.status === 'not_found').length;

  return (
    <div className="batch-register-page">
      <h1>一括登録</h1>
      <p className="description">
        登録したい書籍のタイトルまたはISBNを1行に1つずつ入力してください。
        Google Books APIで検索し、見つかった書籍を一括で登録します。
      </p>

      <form onSubmit={handleSubmit} className="batch-form">
        <textarea
          placeholder="書籍タイトルまたはISBNを1行に1つずつ入力&#10;例:&#10;リーダブルコード&#10;978-4-87311-565-8&#10;Clean Architecture"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={10}
          disabled={isProcessing}
          className="batch-input"
        />

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="btn btn-secondary"
          >
            戻る
          </button>
          <button
            type="submit"
            disabled={isProcessing || !inputText.trim()}
            className="btn btn-primary"
          >
            一括登録
          </button>
        </div>
      </form>

      {error && <p className="error-message">{error}</p>}

      {isProcessing && (
        <div className="progress-section">
          <LoadingSpinner
            message={`処理中... (${progress.current}/${progress.total})`}
          />
        </div>
      )}

      {results.length > 0 && !isProcessing && (
        <div className="results-section">
          <h2>登録結果</h2>
          <div className="results-summary">
            <span className="success">成功: {successCount}件</span>
            <span className="not-found">見つからず: {notFoundCount}件</span>
            <span className="error">エラー: {errorCount}件</span>
          </div>

          <ul className="results-list">
            {results.map((result, index) => (
              <li key={index} className={`result-item ${result.status}`}>
                <span className="result-title">{result.title}</span>
                {result.message && (
                  <span className="result-message">{result.message}</span>
                )}
              </li>
            ))}
          </ul>

          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            書籍一覧へ
          </button>
        </div>
      )}
    </div>
  );
}
