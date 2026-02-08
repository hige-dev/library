import { randomUUID } from 'crypto';
import { getSheetData, appendRow, updateCell, deleteRow } from './sheets';
import { getBookById } from './bookService';

const SHEET_NAME = 'loans';

const COL = {
  ID: 0,
  BOOK_ID: 1,
  BORROWER: 2,
  BORROWED_AT: 3,
  RETURNED_AT: 4,
};

interface Loan {
  id: string;
  bookId: string;
  borrower: string;
  borrowedAt: string;
  returnedAt: string | null;
}

function rowToLoan(row: string[]): Loan {
  return {
    id: String(row[COL.ID] || ''),
    bookId: String(row[COL.BOOK_ID] || ''),
    borrower: String(row[COL.BORROWER] || ''),
    borrowedAt: String(row[COL.BORROWED_AT] || ''),
    returnedAt: row[COL.RETURNED_AT] ? String(row[COL.RETURNED_AT]) : null,
  };
}

function loanToRow(loan: Loan): unknown[] {
  return [loan.id, loan.bookId, loan.borrower, loan.borrowedAt, loan.returnedAt || ''];
}

export async function getLoans(): Promise<Loan[]> {
  const data = await getSheetData(SHEET_NAME);
  if (data.length <= 1) return [];
  return data.slice(1).map(rowToLoan);
}

export async function getLoanByBookId(bookId: string): Promise<Loan | null> {
  const loans = await getLoans();
  return loans.find((l) => l.bookId === bookId && !l.returnedAt) || null;
}

export async function borrowBook(bookId: string, borrower: string): Promise<Loan> {
  const existingLoan = await getLoanByBookId(bookId);
  if (existingLoan) {
    throw new Error('この書籍は既に貸出中です');
  }

  const book = await getBookById(bookId);
  if (!book) {
    throw new Error('書籍が見つかりません');
  }

  const loan: Loan = {
    id: randomUUID(),
    bookId,
    borrower,
    borrowedAt: new Date().toISOString(),
    returnedAt: null,
  };

  await appendRow(SHEET_NAME, loanToRow(loan));
  return loan;
}

export async function returnBook(loanId: string): Promise<Loan> {
  const data = await getSheetData(SHEET_NAME);

  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.ID] === loanId) {
      const returnedAt = new Date().toISOString();
      await updateCell(SHEET_NAME, i + 1, COL.RETURNED_AT, returnedAt);

      const loan = rowToLoan(data[i]);
      loan.returnedAt = returnedAt;
      return loan;
    }
  }

  throw new Error('貸出記録が見つかりません');
}
