import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
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

function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function successResponse(data: unknown): APIGatewayProxyResultV2 {
  return jsonResponse(200, { success: true, data });
}

function errorResponse(statusCode: number, error: string): APIGatewayProxyResultV2 {
  return jsonResponse(statusCode, { success: false, error });
}

async function handleRequest(
  request: Record<string, unknown>,
  userEmail: string
): Promise<unknown> {
  const action = request.action as string;

  switch (action) {
    // 書籍API
    case 'getBooks':
      return getBooksWithReviewStats();

    case 'getBookById':
      return getBookById(request.id as string);

    case 'searchBooks':
      return searchBooks(request.query as string);

    case 'createBook': {
      const book = request.book as Record<string, unknown>;
      book.createdBy = userEmail;
      return createBook(book);
    }

    case 'createBooks': {
      const books = request.books as Record<string, unknown>[];
      books.forEach((b) => { b.createdBy = userEmail; });
      return createBooks(books);
    }

    case 'deleteBook':
      await deleteBook(request.id as string);
      return null;

    // 貸出API
    case 'getLoans':
      return getLoans();

    case 'getLoanByBookId':
      return getLoanByBookId(request.bookId as string);

    case 'borrowBook':
      return borrowBook(request.bookId as string, userEmail);

    case 'returnBook':
      return returnBook(request.loanId as string);

    // レビューAPI
    case 'getAllReviews':
      return getAllReviewsWithBooks();

    case 'getReviewsByBookId':
      return getReviewsByBookId(request.bookId as string);

    case 'getMyReview':
      return getReviewByBookIdAndUser(request.bookId as string, userEmail);

    case 'createOrUpdateReview':
      return createOrUpdateReview(
        request.review as { bookId: string; rating: number; comment: string },
        userEmail
      );

    case 'deleteReview':
      await deleteReview(request.id as string, userEmail);
      return null;

    default:
      throw new Error('Unknown action: ' + action);
  }
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // CORS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  if (event.requestContext.http.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const body = JSON.parse(event.body || '{}');

    // Authorization ヘッダーから ID Token を取得
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const auth = await authenticateRequest(token);
    if (auth.error || !auth.user) {
      return errorResponse(401, auth.error || 'Unauthorized');
    }

    const result = await handleRequest(body, auth.user.email);
    return successResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Error:', message);
    return errorResponse(400, message);
  }
}
