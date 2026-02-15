import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchGoogleBooks, booksApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components';
import type { Book, GoogleBooksVolume } from '../types';

/**
 * ISBN形式かどうかを判定（ハイフン除去後に10桁or13桁の数字、ISBN-10末尾X対応）
 */
function isIsbnQuery(query: string): boolean {
  const cleaned = query.replace(/[-\s]/g, '');
  return /^\d{9}[\dXx]$/.test(cleaned) || /^\d{13}$/.test(cleaned);
}

/**
 * タイトル比較用に正規化（小文字化、全角→半角、スペース除去）
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    .replace(/[\s\u3000]/g, '');
}

type Step = 'input' | 'confirm' | 'result';

interface SearchResultItem {
  inputText: string;
  status: 'found' | 'not_found' | 'error';
  volume?: GoogleBooksVolume;
  selected: boolean;
  titleMismatch: boolean;
  alreadyRegistered: boolean;
}

interface RegisterResult {
  title: string;
  status: 'success' | 'error';
  message?: string;
}

export function BatchRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('input');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // 確認画面用
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);

  // 結果画面用
  const [registerResults, setRegisterResults] = useState<RegisterResult[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const lines = inputText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      setError('登録する書籍タイトルを入力してください。');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress({ current: 0, total: lines.length });

    // 既存書籍を取得して重複チェック用のセットを作成
    let existingGoogleBooksIds = new Set<string>();
    let existingIsbns = new Set<string>();
    try {
      const existingBooks = await booksApi.getAll();
      existingGoogleBooksIds = new Set(
        existingBooks.filter((b) => b.googleBooksId).map((b) => b.googleBooksId)
      );
      existingIsbns = new Set(
        existingBooks.filter((b) => b.isbn).map((b) => b.isbn)
      );
    } catch (e) {
      console.error('Failed to fetch existing books', e);
    }

    const items: SearchResultItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isIsbn = isIsbnQuery(line);
      setProgress({ current: i + 1, total: lines.length });

      try {
        const query = isIsbn
          ? `isbn:${line.replace(/[-\s]/g, '')}`
          : line;
        const searchResult = await searchGoogleBooks(query);

        if (!searchResult.items || searchResult.items.length === 0) {
          items.push({
            inputText: line,
            status: 'not_found',
            selected: false,
            titleMismatch: false,
            alreadyRegistered: false,
          });
        } else {
          const volume = searchResult.items[0];
          const titleMismatch = !isIsbn &&
            normalizeTitle(line) !== normalizeTitle(volume.volumeInfo.title);

          // 重複チェック: googleBooksId または ISBN で判定
          const volumeIsbn = volume.volumeInfo.industryIdentifiers?.find(
            (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
          )?.identifier || '';
          const alreadyRegistered =
            existingGoogleBooksIds.has(volume.id) ||
            (volumeIsbn !== '' && existingIsbns.has(volumeIsbn));

          items.push({
            inputText: line,
            status: 'found',
            volume,
            selected: !alreadyRegistered,
            titleMismatch,
            alreadyRegistered,
          });
        }
      } catch (e) {
        console.error(`Failed to search: ${line}`, e);
        items.push({
          inputText: line,
          status: 'error',
          selected: false,
          titleMismatch: false,
          alreadyRegistered: false,
        });
      }

      // API制限対策のため少し待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setSearchResults(items);
    setStep('confirm');
    setIsProcessing(false);
  };

  const toggleSelect = (index: number) => {
    setSearchResults((prev) =>
      prev.map((item, i) =>
        i === index && item.status === 'found'
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const toggleSelectAll = () => {
    const selectableItems = searchResults.filter(
      (item) => item.status === 'found' && !item.alreadyRegistered
    );
    const allSelected = selectableItems.length > 0 && selectableItems.every((item) => item.selected);
    setSearchResults((prev) =>
      prev.map((item) =>
        item.status === 'found' && !item.alreadyRegistered
          ? { ...item, selected: !allSelected }
          : item
      )
    );
  };

  const handleRegister = async () => {
    if (!user) return;

    const selected = searchResults.filter((item) => item.selected && item.volume);
    if (selected.length === 0) return;

    setIsProcessing(true);
    setError(null);

    const booksToRegister: Array<Omit<Book, 'id' | 'createdAt'>> = selected.map((item) => {
      const { volumeInfo } = item.volume!;
      const isbn = volumeInfo.industryIdentifiers?.find(
        (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
      )?.identifier || '';

      return {
        title: volumeInfo.title,
        isbn,
        authors: volumeInfo.authors || [],
        publisher: volumeInfo.publisher || '',
        publishedDate: volumeInfo.publishedDate || '',
        imageUrl: volumeInfo.imageLinks?.thumbnail || '',
        googleBooksId: item.volume!.id,
        createdBy: user.email,
        genre: '',
        titleKana: '',
      };
    });

    try {
      await booksApi.createBatch(booksToRegister);
      setRegisterResults(
        booksToRegister.map((book) => ({
          title: book.title,
          status: 'success' as const,
        }))
      );
    } catch (e) {
      console.error('Failed to register books', e);
      setError('一括登録に失敗しました。');
      setRegisterResults(
        booksToRegister.map((book) => ({
          title: book.title,
          status: 'error' as const,
          message: '登録に失敗しました',
        }))
      );
    }

    setStep('result');
    setIsProcessing(false);
  };

  const selectedCount = searchResults.filter((item) => item.selected).length;
  const foundCount = searchResults.filter((item) => item.status === 'found').length;
  const notFoundCount = searchResults.filter((item) => item.status === 'not_found').length;
  const errorCount = searchResults.filter((item) => item.status === 'error').length;
  const alreadyRegisteredCount = searchResults.filter((item) => item.alreadyRegistered).length;
  const selectableCount = searchResults.filter(
    (item) => item.status === 'found' && !item.alreadyRegistered
  ).length;

  // 結果画面用: 未選択・見つからなかった・エラーの一覧
  const skippedItems = searchResults.filter(
    (item) => item.status === 'found' && !item.selected
  );
  const failedItems = searchResults.filter(
    (item) => item.status === 'not_found' || item.status === 'error'
  );

  return (
    <div className="batch-register-page">
      <h1>一括登録</h1>

      {error && <p className="error-message">{error}</p>}

      {/* 入力画面 */}
      {step === 'input' && (
        <>
          <p className="description">
            登録したい書籍のタイトルまたはISBNを1行に1つずつ入力してください。
            Google Books APIで検索し、確認後に一括登録します。
          </p>

          <form onSubmit={handleSearch} className="batch-form">
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
                検索
              </button>
            </div>
          </form>

          {isProcessing && (
            <div className="progress-section">
              <LoadingSpinner
                message={`検索中... (${progress.current}/${progress.total})`}
              />
            </div>
          )}
        </>
      )}

      {/* 確認画面 */}
      {step === 'confirm' && (
        <div className="confirm-section">
          <div className="confirm-summary">
            <span className="found">見つかった: {foundCount}件</span>
            {alreadyRegisteredCount > 0 && (
              <span className="already-registered">登録済み: {alreadyRegisteredCount}件</span>
            )}
            {notFoundCount > 0 && (
              <span className="not-found">見つからず: {notFoundCount}件</span>
            )}
            {errorCount > 0 && (
              <span className="error">エラー: {errorCount}件</span>
            )}
          </div>

          <div className="confirm-actions-top">
            <label className="select-all-label">
              <input
                type="checkbox"
                checked={selectableCount > 0 && selectedCount === selectableCount}
                onChange={toggleSelectAll}
                disabled={selectableCount === 0}
              />
              すべて選択
            </label>
          </div>

          <ul className="confirm-list">
            {searchResults.map((item, index) => (
              <li
                key={index}
                className={`confirm-item${
                  item.status === 'not_found' ? ' not-found' : ''
                }${item.status === 'error' ? ' error' : ''}${
                  item.titleMismatch ? ' mismatch' : ''
                }${item.alreadyRegistered ? ' already-registered' : ''}`}
              >
                {item.status === 'found' ? (
                  <>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleSelect(index)}
                      className="confirm-checkbox"
                    />
                    <div className="confirm-thumbnail">
                      {item.volume?.volumeInfo.imageLinks?.thumbnail ? (
                        <img
                          src={item.volume.volumeInfo.imageLinks.thumbnail}
                          alt={item.volume.volumeInfo.title}
                        />
                      ) : (
                        <div className="no-image-small">No Image</div>
                      )}
                    </div>
                    <div className="confirm-info">
                      <div className="confirm-input-text">{item.inputText}</div>
                      <div className="confirm-result-title">
                        → {item.volume?.volumeInfo.title}
                        {item.titleMismatch && (
                          <span className="mismatch-badge">タイトル不一致</span>
                        )}
                        {item.alreadyRegistered && (
                          <span className="registered-badge">登録済み</span>
                        )}
                      </div>
                      <div className="confirm-meta">
                        {item.volume?.volumeInfo.authors?.join(', ') || '著者不明'}
                        {item.volume?.volumeInfo.publisher && (
                          <> / {item.volume.volumeInfo.publisher}</>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      type="checkbox"
                      disabled
                      className="confirm-checkbox"
                    />
                    <div className="confirm-thumbnail">
                      <div className="no-image-small">-</div>
                    </div>
                    <div className="confirm-info">
                      <div className="confirm-input-text">{item.inputText}</div>
                      <div className="confirm-status-message">
                        {item.status === 'not_found'
                          ? '書籍が見つかりませんでした'
                          : '検索に失敗しました'}
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="btn btn-secondary"
            >
              入力に戻る
            </button>
            <button
              type="button"
              onClick={handleRegister}
              disabled={isProcessing || selectedCount === 0}
              className="btn btn-primary"
            >
              選択した {selectedCount} 件を登録
            </button>
          </div>

          {isProcessing && (
            <div className="progress-section">
              <LoadingSpinner message="登録中..." />
            </div>
          )}
        </div>
      )}

      {/* 結果画面 */}
      {step === 'result' && (
        <div className="results-section">
          <h2>登録結果</h2>
          <div className="results-summary">
            <span className="success">
              登録: {registerResults.filter((r) => r.status === 'success').length}件
            </span>
            {registerResults.some((r) => r.status === 'error') && (
              <span className="error">
                エラー: {registerResults.filter((r) => r.status === 'error').length}件
              </span>
            )}
            {skippedItems.length > 0 && (
              <span className="skipped">未登録: {skippedItems.length}件</span>
            )}
            {failedItems.length > 0 && (
              <span className="not-found">見つからず: {failedItems.length}件</span>
            )}
          </div>

          {registerResults.length > 0 && (
            <>
              <h3 className="result-group-title">登録した書籍</h3>
              <ul className="results-list">
                {registerResults.map((result, index) => (
                  <li key={index} className={`result-item ${result.status}`}>
                    <span className="result-title">{result.title}</span>
                    {result.message && (
                      <span className="result-message">{result.message}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {skippedItems.length > 0 && (
            <>
              <h3 className="result-group-title">未登録（スキップ）</h3>
              <ul className="results-list">
                {skippedItems.map((item, index) => (
                  <li key={index} className="result-item skipped">
                    <span className="result-title">
                      {item.volume?.volumeInfo.title || item.inputText}
                    </span>
                    <span className="result-message">
                      {item.alreadyRegistered ? '登録済みのためスキップ' : '未選択'}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {failedItems.length > 0 && (
            <>
              <h3 className="result-group-title">見つからなかった入力</h3>
              <ul className="results-list">
                {failedItems.map((item, index) => (
                  <li key={index} className="result-item not_found">
                    <span className="result-title">{item.inputText}</span>
                    <span className="result-message">
                      {item.status === 'not_found'
                        ? '書籍が見つかりませんでした'
                        : '検索に失敗しました'}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

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
