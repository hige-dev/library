/**
 * スプレッドシートの設定
 * 実際のスプレッドシートIDに置き換えてください
 */
var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '';

/**
 * シート名の定数
 */
var SHEET_NAMES = {
  BOOKS: 'books',
  LOANS: 'loans',
};

/**
 * 書籍シートのカラムインデックス（0始まり）
 */
var BOOK_COLUMNS = {
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

/**
 * 貸出シートのカラムインデックス（0始まり）
 */
var LOAN_COLUMNS = {
  ID: 0,
  BOOK_ID: 1,
  BORROWER: 2,
  BORROWED_AT: 3,
  RETURNED_AT: 4,
};
