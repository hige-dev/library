/**
 * UUIDを生成する
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * 現在日時をISO文字列で取得
 */
function getCurrentISOString() {
  return new Date().toISOString();
}

/**
 * スプレッドシートを取得
 */
function getSpreadsheet() {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID が設定されていません');
  }
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!ss) {
    throw new Error('スプレッドシートが見つかりません');
  }
  return ss;
}

/**
 * シートを取得（存在しない場合は作成）
 */
function getOrCreateSheet(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }

  return sheet;
}

/**
 * シートを初期化（ヘッダー行を追加）
 */
function initializeSheet(sheet, sheetName) {
  if (sheetName === SHEET_NAMES.BOOKS) {
    sheet.appendRow([
      'id',
      'title',
      'isbn',
      'authors',
      'publisher',
      'publishedDate',
      'imageUrl',
      'googleBooksId',
      'createdAt',
      'createdBy',
      'genre',
      'titleKana',
    ]);
  } else if (sheetName === SHEET_NAMES.LOANS) {
    sheet.appendRow(['id', 'bookId', 'borrower', 'borrowedAt', 'returnedAt']);
  }
}

/**
 * 成功レスポンスを作成
 */
function createSuccessResponse(data) {
  return { success: true, data: data };
}

/**
 * エラーレスポンスを作成
 */
function createErrorResponse(error) {
  return { success: false, error: error };
}

/**
 * JSONレスポンスを返す
 */
function createJsonOutput(response) {
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON
  );
}
