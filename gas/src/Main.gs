/**
 * メインエントリーポイント
 * Web Appとしてのリクエストハンドラ
 */

/**
 * GETリクエストのハンドラ
 */
function doGet(e) {
  return createJsonOutput(createSuccessResponse({ message: 'Library API is running' }));
}

/**
 * POSTリクエストのハンドラ
 */
function doPost(e) {
  try {
    var request = JSON.parse(e.postData.contents);
    var result = handleRequest(request);
    return createJsonOutput(createSuccessResponse(result));
  } catch (error) {
    var errorMessage = error.message || 'Unknown error';
    console.error('API Error:', errorMessage);
    return createJsonOutput(createErrorResponse(errorMessage));
  }
}

/**
 * リクエストをルーティング
 */
function handleRequest(request) {
  var action = request.action;

  switch (action) {
    // 書籍API
    case 'getBooks':
      return getBooks();

    case 'searchBooks':
      return searchBooks(request.query);

    case 'createBook':
      return createBook(request.book);

    case 'createBooks':
      return createBooks(request.books);

    case 'deleteBook':
      deleteBook(request.id);
      return null;

    // 貸出API
    case 'getLoans':
      return getLoans();

    case 'getLoanByBookId':
      return getLoanByBookId(request.bookId);

    case 'borrowBook':
      return borrowBook(request.bookId, request.borrower);

    case 'returnBook':
      return returnBook(request.loanId);

    // Google Books API
    case 'searchGoogleBooks':
      return searchGoogleBooks(request.query);

    case 'getGoogleBookById':
      return getGoogleBookById(request.volumeId);

    default:
      throw new Error('Unknown action: ' + action);
  }
}

/**
 * 初期セットアップ用関数
 * スクリプトエディタから手動実行
 */
function setupSpreadsheet() {
  // シートを作成
  getOrCreateSheet(SHEET_NAMES.BOOKS);
  getOrCreateSheet(SHEET_NAMES.LOANS);

  console.log('セットアップ完了');
}
