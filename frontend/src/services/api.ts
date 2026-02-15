import { config } from '../config';
import type { Book, Loan, Review, ReviewWithBook, ApiResponse, GoogleBooksSearchResult, GoogleBooksVolume, Role } from '../types';

// 認証トークン（グローバル）
let authToken: string | null = null;

/**
 * 認証トークンを設定
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/**
 * 認証トークンを取得
 */
export function getAuthToken(): string | null {
  return authToken;
}

/**
 * リクエストボディのSHA-256ハッシュを計算
 * CloudFront OACがLambda Function URLへのPOSTリクエストを署名するために必要
 */
async function computeSha256(body: string): Promise<string> {
  const data = new TextEncoder().encode(body);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// API呼び出し用のヘルパー
async function callApi<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!authToken) {
    throw new Error('認証が必要です');
  }

  const body = JSON.stringify({ action, ...params });
  const bodyHash = await computeSha256(body);

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': authToken,
      'x-amz-content-sha256': bodyHash,
    },
    body,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('AUTH_ERROR:Unauthorized');
    }
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    if (data.error === 'Unauthorized' || data.error === 'Domain not allowed') {
      throw new Error('AUTH_ERROR:' + data.error);
    }
    throw new Error(data.error || 'APIエラーが発生しました');
  }

  return data.data as T;
}

/**
 * Google Books APIで書籍を検索（Lambda経由）
 */
export async function searchGoogleBooks(query: string): Promise<GoogleBooksSearchResult> {
  return callApi<GoogleBooksSearchResult>('searchGoogleBooks', { query });
}

/**
 * Google Books APIで書籍詳細を取得（Lambda経由）
 */
export async function getGoogleBookById(volumeId: string): Promise<GoogleBooksVolume> {
  return callApi<GoogleBooksVolume>('getGoogleBookById', { volumeId });
}

// ユーザーAPI
export const usersApi = {
  /**
   * 自分のロールを取得
   */
  async getMyRole(): Promise<Role> {
    const result = await callApi<{ role: Role }>('getMyRole');
    return result.role;
  },
};

// 書籍API
export const booksApi = {
  /**
   * 書籍一覧を取得
   */
  async getAll(): Promise<Book[]> {
    return callApi<Book[]>('getBooks');
  },

  /**
   * 書籍を1件取得
   */
  async getById(id: string): Promise<Book | null> {
    return callApi<Book | null>('getBookById', { id });
  },

  /**
   * 書籍を検索
   */
  async search(query: string): Promise<Book[]> {
    return callApi<Book[]>('searchBooks', { query });
  },

  /**
   * 書籍を登録
   */
  async create(book: Omit<Book, 'id' | 'createdAt'>): Promise<Book> {
    return callApi<Book>('createBook', { book });
  },

  /**
   * 複数の書籍を一括登録
   */
  async createBatch(books: Array<Omit<Book, 'id' | 'createdAt'>>): Promise<Book[]> {
    return callApi<Book[]>('createBooks', { books });
  },

  /**
   * 書籍を削除
   */
  async delete(id: string): Promise<void> {
    return callApi<void>('deleteBook', { id });
  },
};

// 貸出API
export const loansApi = {
  /**
   * 貸出一覧を取得
   */
  async getAll(): Promise<Loan[]> {
    return callApi<Loan[]>('getLoans');
  },

  /**
   * 書籍の現在の貸出状況を取得
   */
  async getByBookId(bookId: string): Promise<Loan | null> {
    return callApi<Loan | null>('getLoanByBookId', { bookId });
  },

  /**
   * 貸出を作成（借り手は認証ユーザーから自動設定）
   */
  async borrow(bookId: string): Promise<Loan> {
    return callApi<Loan>('borrowBook', { bookId });
  },

  /**
   * 返却処理
   */
  async return(loanId: string): Promise<Loan> {
    return callApi<Loan>('returnBook', { loanId });
  },
};

// レビューAPI
export const reviewsApi = {
  /**
   * 全レビュー一覧を取得（書籍情報付き）
   */
  async getAll(): Promise<ReviewWithBook[]> {
    return callApi<ReviewWithBook[]>('getAllReviews');
  },

  /**
   * 書籍のレビュー一覧を取得
   */
  async getByBookId(bookId: string): Promise<Review[]> {
    return callApi<Review[]>('getReviewsByBookId', { bookId });
  },

  /**
   * 自分のレビューを取得
   */
  async getMyReview(bookId: string): Promise<Review | null> {
    return callApi<Review | null>('getMyReview', { bookId });
  },

  /**
   * レビューを作成または更新
   */
  async createOrUpdate(review: { bookId: string; rating: number; comment: string }): Promise<Review> {
    return callApi<Review>('createOrUpdateReview', { review });
  },

  /**
   * レビューを削除
   */
  async delete(id: string): Promise<void> {
    return callApi<void>('deleteReview', { id });
  },
};
