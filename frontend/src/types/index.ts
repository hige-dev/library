// 書籍データ型
export interface Book {
  id: string;
  title: string;
  isbn: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  imageUrl: string;
  googleBooksId: string;
  createdAt: string;
  createdBy: string;
  genre: string;
  titleKana: string;
  averageRating?: number;
  reviewCount?: number;
}

// 貸出データ型
export interface Loan {
  id: string;
  bookId: string;
  borrower: string;
  borrowedAt: string;
  returnedAt: string | null;
}

// レビューデータ型
export interface Review {
  id: string;
  bookId: string;
  rating: number;
  comment: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// レビュー（書籍情報付き）
export interface ReviewWithBook extends Review {
  bookTitle: string;
  bookImageUrl: string;
}

// 書籍と貸出情報を結合した型
export interface BookWithLoan extends Book {
  currentLoan: Loan | null;
}

// Google Books API レスポンス型
export interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

export interface GoogleBooksSearchResult {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ユーザー情報型
export interface User {
  email: string;
  name: string;
  picture?: string;
}

// 環境設定型
export interface Config {
  imageStorage: 'local' | 's3';
  imageBaseUrl: string;
  googleClientId: string;
  apiUrl: string;
  allowedDomains: string[];
  googleBooksApiKey: string;
}
