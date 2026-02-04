/**
 * 貸出サービス
 */

/**
 * 全貸出を取得
 */
function getLoans() {
  var sheet = getOrCreateSheet(SHEET_NAMES.LOANS);
  var data = sheet.getDataRange().getValues();

  // ヘッダー行をスキップ
  if (data.length <= 1) {
    return [];
  }

  return data.slice(1).map(function(row) {
    return rowToLoan(row);
  });
}

/**
 * 書籍IDで現在の貸出を取得（未返却のもの）
 */
function getLoanByBookId(bookId) {
  var loans = getLoans();
  for (var i = 0; i < loans.length; i++) {
    if (loans[i].bookId === bookId && !loans[i].returnedAt) {
      return loans[i];
    }
  }
  return null;
}

/**
 * 貸出を作成
 */
function borrowBook(bookId, borrower) {
  // 既に貸出中かチェック
  var existingLoan = getLoanByBookId(bookId);
  if (existingLoan) {
    throw new Error('この書籍は既に貸出中です');
  }

  // 書籍が存在するかチェック
  var book = getBookById(bookId);
  if (!book) {
    throw new Error('書籍が見つかりません');
  }

  var sheet = getOrCreateSheet(SHEET_NAMES.LOANS);

  var loan = {
    id: generateUUID(),
    bookId: bookId,
    borrower: borrower,
    borrowedAt: getCurrentISOString(),
    returnedAt: null,
  };

  sheet.appendRow(loanToRow(loan));

  return loan;
}

/**
 * 返却処理
 */
function returnBook(loanId) {
  var sheet = getOrCreateSheet(SHEET_NAMES.LOANS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][LOAN_COLUMNS.ID] === loanId) {
      var returnedAt = getCurrentISOString();
      sheet.getRange(i + 1, LOAN_COLUMNS.RETURNED_AT + 1).setValue(returnedAt);

      var loan = rowToLoan(data[i]);
      loan.returnedAt = returnedAt;
      return loan;
    }
  }

  throw new Error('貸出記録が見つかりません');
}

/**
 * 行データを貸出オブジェクトに変換
 */
function rowToLoan(row) {
  return {
    id: String(row[LOAN_COLUMNS.ID] || ''),
    bookId: String(row[LOAN_COLUMNS.BOOK_ID] || ''),
    borrower: String(row[LOAN_COLUMNS.BORROWER] || ''),
    borrowedAt: String(row[LOAN_COLUMNS.BORROWED_AT] || ''),
    returnedAt: row[LOAN_COLUMNS.RETURNED_AT] ? String(row[LOAN_COLUMNS.RETURNED_AT]) : null,
  };
}

/**
 * 貸出オブジェクトを行データに変換
 */
function loanToRow(loan) {
  return [loan.id, loan.bookId, loan.borrower, loan.borrowedAt, loan.returnedAt || ''];
}
