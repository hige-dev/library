import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { AppError } from './errors';
import { authenticateRequest } from './auth';
import {
  getBooksWithReviewStats,
  getBookById,
  searchBooks,
  createBook,
  createBooks,
  deleteBook,
} from './bookService';
import { getLoans, getLoanByBookId, borrowBook, returnBook } from './loanService';
import {
  getAllReviewsWithBooks,
  getReviewsByBookId,
  getReviewByBookIdAndUser,
  createOrUpdateReview,
  deleteReview,
} from './reviewService';
import { getUserRole, type Role } from './userService';

function getAllowedOrigin(): string {
  return process.env.ALLOWED_ORIGIN || '*';
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, x-amz-content-sha256',
  };
}

function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(body),
  };
}

function successResponse(data: unknown): APIGatewayProxyResultV2 {
  return jsonResponse(200, { success: true, data });
}

function errorResponse(statusCode: number, error: string): APIGatewayProxyResultV2 {
  return jsonResponse(statusCode, { success: false, error });
}

/** リクエストから必須の文字列パラメータを取得 */
function requireString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError(`${key} は必須です`);
  }
  return value;
}

/** リクエストから必須のオブジェクトパラメータを取得 */
function requireObject(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = obj[key];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new AppError(`${key} は必須です`);
  }
  return value as Record<string, unknown>;
}

/** リクエストから必須の配列パラメータを取得 */
function requireArray(obj: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = obj[key];
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(`${key} は必須です`);
  }
  return value as Record<string, unknown>[];
}

async function handleRequest(
  request: Record<string, unknown>,
  userEmail: string,
  role: Role
): Promise<unknown> {
  const action = request.action;
  if (typeof action !== 'string' || action.length === 0) {
    throw new AppError('action は必須です');
  }

  switch (action) {
    // ユーザーAPI
    case 'getMyRole':
      return { role };

    // 書籍API
    case 'getBooks':
      return getBooksWithReviewStats();

    case 'getBookById':
      return getBookById(requireString(request, 'id'));

    case 'searchBooks':
      return searchBooks(requireString(request, 'query'));

    case 'createBook': {
      const book = requireObject(request, 'book');
      book.createdBy = userEmail;
      return createBook(book);
    }

    case 'createBooks': {
      const books = requireArray(request, 'books');
      books.forEach((b) => { b.createdBy = userEmail; });
      return createBooks(books);
    }

    case 'deleteBook':
      await deleteBook(requireString(request, 'id'), role);
      return null;

    // 貸出API
    case 'getLoans':
      return getLoans();

    case 'getLoanByBookId':
      return getLoanByBookId(requireString(request, 'bookId'));

    case 'borrowBook':
      return borrowBook(requireString(request, 'bookId'), userEmail);

    case 'returnBook':
      return returnBook(requireString(request, 'loanId'), userEmail, role);

    // レビューAPI
    case 'getAllReviews':
      return getAllReviewsWithBooks();

    case 'getReviewsByBookId':
      return getReviewsByBookId(requireString(request, 'bookId'));

    case 'getMyReview':
      return getReviewByBookIdAndUser(requireString(request, 'bookId'), userEmail);

    case 'createOrUpdateReview':
      return createOrUpdateReview(
        requireObject(request, 'review') as { bookId: string; rating: number; comment: string },
        userEmail
      );

    case 'deleteReview':
      await deleteReview(requireString(request, 'id'), userEmail, role);
      return null;

    default:
      throw new AppError('不明なアクション: ' + action);
  }
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // CORS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
    };
  }

  if (event.requestContext.http.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const body = JSON.parse(event.body || '{}');

    // X-Auth-Token ヘッダーから ID Token を取得
    const token = event.headers?.['x-auth-token'] || '';

    const auth = await authenticateRequest(token);
    if (auth.error || !auth.user) {
      return errorResponse(401, auth.error || 'Unauthorized');
    }

    const role = await getUserRole(auth.user.email);
    const result = await handleRequest(body, auth.user.email, role);
    return successResponse(result);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.statusCode, error.message);
    }
    console.error('Internal Error:', error);
    return errorResponse(500, 'サーバーエラーが発生しました');
  }
}
