import { randomUUID } from 'crypto';
import { getSheetData, appendRow, appendRows, deleteRow } from './sheets';
import { AppError } from './errors';
import type { Role } from './userService';

const SHEET_NAME = 'books';

const COL = {
  ID: 0,
  TITLE: 1,
  ISBN: 2,
  AUTHORS: 3,
  PUBLISHER: 4,
  PUBLISHED_DATE: 5,
  IMAGE_URL: 6,
  GOOGLE_BOOKS_ID: 7,
  CREATED_AT: 8,
  CREATED_BY: 9,
  GENRE: 10,
  TITLE_KANA: 11,
};

interface Book {
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

function rowToBook(row: string[]): Book {
  const authorsStr = String(row[COL.AUTHORS] || '');
  const authors = authorsStr
    .split(',')
    .map((a) => a.trim())
    .filter((a) => a.length > 0);

  return {
    id: String(row[COL.ID] || ''),
    title: String(row[COL.TITLE] || ''),
    isbn: String(row[COL.ISBN] || ''),
    authors,
    publisher: String(row[COL.PUBLISHER] || ''),
    publishedDate: String(row[COL.PUBLISHED_DATE] || ''),
    imageUrl: String(row[COL.IMAGE_URL] || ''),
    googleBooksId: String(row[COL.GOOGLE_BOOKS_ID] || ''),
    createdAt: String(row[COL.CREATED_AT] || ''),
    createdBy: String(row[COL.CREATED_BY] || ''),
    genre: String(row[COL.GENRE] || ''),
    titleKana: String(row[COL.TITLE_KANA] || ''),
  };
}

function bookToRow(book: Book): unknown[] {
  return [
    book.id,
    book.title,
    book.isbn,
    book.authors.join(', '),
    book.publisher,
    book.publishedDate,
    book.imageUrl,
    book.googleBooksId,
    book.createdAt,
    book.createdBy,
    book.genre || '',
    book.titleKana || '',
  ];
}

export async function getBooks(): Promise<Book[]> {
  const data = await getSheetData(SHEET_NAME);
  if (data.length <= 1) return [];
  return data.slice(1).map(rowToBook);
}

export async function getBooksWithReviewStats(): Promise<Book[]> {
  const { getAllReviewStats } = await import('./reviewService');
  const books = await getBooks();
  const stats = await getAllReviewStats();

  return books.map((book) => {
    const s = stats[book.id] || { averageRating: 0, reviewCount: 0 };
    return { ...book, averageRating: s.averageRating, reviewCount: s.reviewCount };
  });
}

export async function getBookById(id: string): Promise<Book | null> {
  const books = await getBooks();
  return books.find((b) => b.id === id) || null;
}

export async function searchBooks(query: string): Promise<Book[]> {
  const books = await getBooks();
  const lowerQuery = query.toLowerCase();
  return books.filter(
    (book) =>
      book.title.toLowerCase().includes(lowerQuery) ||
      book.authors.some((a) => a.toLowerCase().includes(lowerQuery)) ||
      book.isbn.includes(query)
  );
}

function checkDuplicate(books: Book[], isbn: string, googleBooksId: string): Book | null {
  for (const book of books) {
    if (isbn && book.isbn === isbn) return book;
    if (googleBooksId && book.googleBooksId === googleBooksId) return book;
  }
  return null;
}

export async function createBook(bookData: Record<string, unknown>): Promise<Book> {
  const books = await getBooks();
  const duplicate = checkDuplicate(
    books,
    String(bookData.isbn || ''),
    String(bookData.googleBooksId || '')
  );
  if (duplicate) {
    throw new AppError('この書籍は既に登録されています: ' + duplicate.title);
  }

  const book: Book = {
    id: randomUUID(),
    title: String(bookData.title || ''),
    isbn: String(bookData.isbn || ''),
    authors: Array.isArray(bookData.authors) ? bookData.authors : [],
    publisher: String(bookData.publisher || ''),
    publishedDate: String(bookData.publishedDate || ''),
    imageUrl: String(bookData.imageUrl || ''),
    googleBooksId: String(bookData.googleBooksId || ''),
    createdAt: new Date().toISOString(),
    createdBy: String(bookData.createdBy || ''),
    genre: String(bookData.genre || ''),
    titleKana: String(bookData.titleKana || ''),
  };

  await appendRow(SHEET_NAME, bookToRow(book));
  return book;
}

export async function createBooks(booksData: Record<string, unknown>[]): Promise<Book[]> {
  const existingBooks = await getBooks();
  const createdBooks: Book[] = [];
  const rows: unknown[][] = [];

  for (const bookData of booksData) {
    const duplicate = checkDuplicate(
      existingBooks,
      String(bookData.isbn || ''),
      String(bookData.googleBooksId || '')
    );
    if (duplicate) continue;

    const book: Book = {
      id: randomUUID(),
      title: String(bookData.title || ''),
      isbn: String(bookData.isbn || ''),
      authors: Array.isArray(bookData.authors) ? bookData.authors : [],
      publisher: String(bookData.publisher || ''),
      publishedDate: String(bookData.publishedDate || ''),
      imageUrl: String(bookData.imageUrl || ''),
      googleBooksId: String(bookData.googleBooksId || ''),
      createdAt: new Date().toISOString(),
      createdBy: String(bookData.createdBy || ''),
      genre: String(bookData.genre || ''),
      titleKana: String(bookData.titleKana || ''),
    };
    createdBooks.push(book);
    rows.push(bookToRow(book));
  }

  await appendRows(SHEET_NAME, rows);
  return createdBooks;
}

export async function deleteBook(id: string, role: Role): Promise<void> {
  if (role !== 'admin') {
    throw new AppError('書籍の削除は管理者のみ可能です', 403);
  }
  const data = await getSheetData(SHEET_NAME);
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.ID] === id) {
      await deleteRow(SHEET_NAME, i + 1);
      return;
    }
  }
  throw new AppError('書籍が見つかりません', 404);
}
