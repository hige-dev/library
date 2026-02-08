import { randomUUID } from 'crypto';
import { getSheetData, appendRow, updateRow, deleteRow } from './sheets';
import { getBooks } from './bookService';

const SHEET_NAME = 'reviews';

const COL = {
  ID: 0,
  BOOK_ID: 1,
  RATING: 2,
  COMMENT: 3,
  CREATED_BY: 4,
  CREATED_AT: 5,
  UPDATED_AT: 6,
};

interface Review {
  id: string;
  bookId: string;
  rating: number;
  comment: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ReviewWithBook extends Review {
  bookTitle: string;
  bookImageUrl: string;
}

interface ReviewStats {
  [bookId: string]: { averageRating: number; reviewCount: number };
}

function rowToReview(row: string[]): Review {
  return {
    id: String(row[COL.ID] || ''),
    bookId: String(row[COL.BOOK_ID] || ''),
    rating: Number(row[COL.RATING] || 0),
    comment: String(row[COL.COMMENT] || ''),
    createdBy: String(row[COL.CREATED_BY] || ''),
    createdAt: String(row[COL.CREATED_AT] || ''),
    updatedAt: String(row[COL.UPDATED_AT] || ''),
  };
}

function reviewToRow(review: Review): unknown[] {
  return [
    review.id,
    review.bookId,
    review.rating,
    review.comment,
    review.createdBy,
    review.createdAt,
    review.updatedAt,
  ];
}

export async function getAllReviewStats(): Promise<ReviewStats> {
  const data = await getSheetData(SHEET_NAME);
  const stats: { [bookId: string]: { total: number; count: number } } = {};

  for (let i = 1; i < data.length; i++) {
    const bookId = String(data[i][COL.BOOK_ID]);
    const rating = Number(data[i][COL.RATING]);
    if (!stats[bookId]) {
      stats[bookId] = { total: 0, count: 0 };
    }
    stats[bookId].total += rating;
    stats[bookId].count += 1;
  }

  const result: ReviewStats = {};
  for (const bookId of Object.keys(stats)) {
    result[bookId] = {
      averageRating: stats[bookId].total / stats[bookId].count,
      reviewCount: stats[bookId].count,
    };
  }
  return result;
}

export async function getAllReviewsWithBooks(): Promise<ReviewWithBook[]> {
  const data = await getSheetData(SHEET_NAME);
  const books = await getBooks();
  const bookMap: { [id: string]: { title: string; imageUrl: string } } = {};
  for (const book of books) {
    bookMap[book.id] = { title: book.title, imageUrl: book.imageUrl };
  }

  const reviews: ReviewWithBook[] = [];
  for (let i = 1; i < data.length; i++) {
    const review = rowToReview(data[i]);
    const book = bookMap[review.bookId];
    reviews.push({
      ...review,
      bookTitle: book ? book.title : '（削除された書籍）',
      bookImageUrl: book ? book.imageUrl : '',
    });
  }

  reviews.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return reviews;
}

export async function getReviewsByBookId(bookId: string): Promise<Review[]> {
  const data = await getSheetData(SHEET_NAME);
  const reviews: Review[] = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL.BOOK_ID]) === bookId) {
      reviews.push(rowToReview(data[i]));
    }
  }
  return reviews;
}

export async function getReviewByBookIdAndUser(
  bookId: string,
  email: string
): Promise<Review | null> {
  const data = await getSheetData(SHEET_NAME);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL.BOOK_ID]) === bookId && String(data[i][COL.CREATED_BY]) === email) {
      return rowToReview(data[i]);
    }
  }
  return null;
}

export async function createOrUpdateReview(
  reviewData: { bookId: string; rating: number; comment: string },
  userEmail: string
): Promise<Review> {
  const data = await getSheetData(SHEET_NAME);
  const now = new Date().toISOString();

  // 既存レビューを検索
  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][COL.BOOK_ID]) === reviewData.bookId &&
      String(data[i][COL.CREATED_BY]) === userEmail
    ) {
      const review: Review = {
        id: String(data[i][COL.ID]),
        bookId: reviewData.bookId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        createdBy: userEmail,
        createdAt: String(data[i][COL.CREATED_AT]),
        updatedAt: now,
      };
      await updateRow(SHEET_NAME, i + 1, reviewToRow(review));
      return review;
    }
  }

  // 新規作成
  const review: Review = {
    id: randomUUID(),
    bookId: reviewData.bookId,
    rating: reviewData.rating,
    comment: reviewData.comment,
    createdBy: userEmail,
    createdAt: now,
    updatedAt: now,
  };
  await appendRow(SHEET_NAME, reviewToRow(review));
  return review;
}

export async function deleteReview(id: string, userEmail: string): Promise<void> {
  const data = await getSheetData(SHEET_NAME);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL.ID]) === id) {
      if (String(data[i][COL.CREATED_BY]) !== userEmail) {
        throw new Error('自分のレビューのみ削除できます');
      }
      await deleteRow(SHEET_NAME, i + 1);
      return;
    }
  }
  throw new Error('レビューが見つかりません');
}
