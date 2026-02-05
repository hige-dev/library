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

    // 認証
    var auth = authenticateRequest(request);
    if (auth.error) {
      return createJsonOutput(createErrorResponse(auth.error));
    }

    // 認証済みユーザー情報をリクエストに追加
    request.authenticatedUser = auth.user;

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
      return getBooksWithReviewStats();

    case 'getBookById':
      return getBookById(request.id);

    case 'searchBooks':
      return searchBooks(request.query);

    case 'createBook':
      // 認証済みユーザーをcreatedByに使用
      request.book.createdBy = request.authenticatedUser.email;
      return createBook(request.book);

    case 'createBooks':
      // 認証済みユーザーをcreatedByに使用
      var userEmail = request.authenticatedUser.email;
      request.books.forEach(function(book) {
        book.createdBy = userEmail;
      });
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
      // 認証済みユーザーをborrowerに使用
      return borrowBook(request.bookId, request.authenticatedUser.email);

    case 'returnBook':
      return returnBook(request.loanId);

    // レビューAPI
    case 'getReviewsByBookId':
      return getReviewsByBookId(request.bookId);

    case 'getMyReview':
      return getReviewByBookIdAndUser(request.bookId, request.authenticatedUser.email);

    case 'createOrUpdateReview':
      return createOrUpdateReview(request.review, request.authenticatedUser.email);

    case 'deleteReview':
      deleteReview(request.id, request.authenticatedUser.email);
      return null;

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
  getOrCreateSheet(SHEET_NAMES.REVIEWS);

  console.log('セットアップ完了');
}
