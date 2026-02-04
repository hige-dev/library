import { config } from '../config';
import type { Book, Loan, ApiResponse, GoogleBooksSearchResult, GoogleBooksVolume } from '../types';

// Google Books API
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

// GAS API呼び出し用のヘルパー（fetchを使用）
async function callGasApi<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const body = JSON.stringify({ action, ...params });

  const response = await fetch(config.gasApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'APIエラーが発生しました');
  }

  return data.data as T;
}

/**
 * Google Books APIで書籍を検索（フロントエンドから直接）
 */
export async function searchGoogleBooks(query: string): Promise<GoogleBooksSearchResult> {
  const params = new URLSearchParams({
    q: query,
    maxResults: '10',
    langRestrict: 'ja',
  });

  if (config.googleBooksApiKey) {
    params.set('key', config.googleBooksApiKey);
  }

  const response = await fetch(`${GOOGLE_BOOKS_API}?${params}`);

  if (!response.ok) {
    throw new Error(`Google Books API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Google Books APIで書籍詳細を取得（フロントエンドから直接）
 */
export async function getGoogleBookById(volumeId: string): Promise<GoogleBooksVolume> {
  const params = new URLSearchParams();

  if (config.googleBooksApiKey) {
    params.set('key', config.googleBooksApiKey);
  }

  const url = params.toString()
    ? `${GOOGLE_BOOKS_API}/${volumeId}?${params}`
    : `${GOOGLE_BOOKS_API}/${volumeId}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Books API error: ${response.status}`);
  }

  return response.json();
}

// 書籍API
export const booksApi = {
  /**
   * 書籍一覧を取得
   */
  async getAll(): Promise<Book[]> {
    return callGasApi<Book[]>('getBooks');
  },

  /**
   * 書籍を検索
   */
  async search(query: string): Promise<Book[]> {
    return callGasApi<Book[]>('searchBooks', { query });
  },

  /**
   * 書籍を登録
   */
  async create(book: Omit<Book, 'id' | 'createdAt'>): Promise<Book> {
    return callGasApi<Book>('createBook', { book });
  },

  /**
   * 複数の書籍を一括登録
   */
  async createBatch(books: Array<Omit<Book, 'id' | 'createdAt'>>): Promise<Book[]> {
    return callGasApi<Book[]>('createBooks', { books });
  },

  /**
   * 書籍を削除
   */
  async delete(id: string): Promise<void> {
    return callGasApi<void>('deleteBook', { id });
  },
};

// 貸出API
export const loansApi = {
  /**
   * 貸出一覧を取得
   */
  async getAll(): Promise<Loan[]> {
    return callGasApi<Loan[]>('getLoans');
  },

  /**
   * 書籍の現在の貸出状況を取得
   */
  async getByBookId(bookId: string): Promise<Loan | null> {
    return callGasApi<Loan | null>('getLoanByBookId', { bookId });
  },

  /**
   * 貸出を作成
   */
  async borrow(bookId: string, borrower: string): Promise<Loan> {
    return callGasApi<Loan>('borrowBook', { bookId, borrower });
  },

  /**
   * 返却処理
   */
  async return(loanId: string): Promise<Loan> {
    return callGasApi<Loan>('returnBook', { loanId });
  },
};
