/**
 * 書籍サービス
 */

/**
 * 全書籍を取得
 */
function getBooks() {
  var sheet = getOrCreateSheet(SHEET_NAMES.BOOKS);
  var data = sheet.getDataRange().getValues();

  // ヘッダー行をスキップ
  if (data.length <= 1) {
    return [];
  }

  return data.slice(1).map(function(row) {
    return rowToBook(row);
  });
}

/**
 * 書籍を検索
 */
function searchBooks(query) {
  var books = getBooks();
  var lowerQuery = query.toLowerCase();

  return books.filter(function(book) {
    return book.title.toLowerCase().indexOf(lowerQuery) !== -1 ||
      book.authors.some(function(author) {
        return author.toLowerCase().indexOf(lowerQuery) !== -1;
      }) ||
      book.isbn.indexOf(query) !== -1;
  });
}

/**
 * IDで書籍を取得
 */
function getBookById(id) {
  var books = getBooks();
  for (var i = 0; i < books.length; i++) {
    if (books[i].id === id) {
      return books[i];
    }
  }
  return null;
}

/**
 * ISBNまたはGoogleBooksIdで書籍の重複をチェック
 */
function checkDuplicateBook(isbn, googleBooksId) {
  var books = getBooks();
  for (var i = 0; i < books.length; i++) {
    if (isbn && books[i].isbn === isbn) {
      return books[i];
    }
    if (googleBooksId && books[i].googleBooksId === googleBooksId) {
      return books[i];
    }
  }
  return null;
}

/**
 * 書籍を作成
 */
function createBook(bookData) {
  // 重複チェック
  var duplicate = checkDuplicateBook(bookData.isbn, bookData.googleBooksId);
  if (duplicate) {
    throw new Error('この書籍は既に登録されています: ' + duplicate.title);
  }

  var sheet = getOrCreateSheet(SHEET_NAMES.BOOKS);

  var book = {
    id: generateUUID(),
    title: bookData.title,
    isbn: bookData.isbn,
    authors: bookData.authors,
    publisher: bookData.publisher,
    publishedDate: bookData.publishedDate,
    imageUrl: bookData.imageUrl,
    googleBooksId: bookData.googleBooksId,
    createdAt: getCurrentISOString(),
    createdBy: bookData.createdBy,
    genre: bookData.genre || '',
    titleKana: bookData.titleKana || '',
  };

  sheet.appendRow(bookToRow(book));

  return book;
}

/**
 * 複数の書籍を一括作成（重複はスキップ）
 */
function createBooks(booksData) {
  var sheet = getOrCreateSheet(SHEET_NAMES.BOOKS);
  var createdBooks = [];
  var rows = [];

  booksData.forEach(function(bookData) {
    // 重複チェック（重複はスキップ）
    var duplicate = checkDuplicateBook(bookData.isbn, bookData.googleBooksId);
    if (duplicate) {
      return; // スキップ
    }

    var book = {
      id: generateUUID(),
      title: bookData.title,
      isbn: bookData.isbn,
      authors: bookData.authors,
      publisher: bookData.publisher,
      publishedDate: bookData.publishedDate,
      imageUrl: bookData.imageUrl,
      googleBooksId: bookData.googleBooksId,
      createdAt: getCurrentISOString(),
      createdBy: bookData.createdBy,
      genre: bookData.genre || '',
      titleKana: bookData.titleKana || '',
    };
    createdBooks.push(book);
    rows.push(bookToRow(book));
  });

  // 一括追加
  if (rows.length > 0) {
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  return createdBooks;
}

/**
 * 書籍を削除
 */
function deleteBook(id) {
  var sheet = getOrCreateSheet(SHEET_NAMES.BOOKS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][BOOK_COLUMNS.ID] === id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }

  throw new Error('書籍が見つかりません');
}

/**
 * 行データを書籍オブジェクトに変換
 */
function rowToBook(row) {
  var authorsStr = String(row[BOOK_COLUMNS.AUTHORS] || '');
  var authors = authorsStr.split(',').map(function(a) {
    return a.trim();
  }).filter(function(a) {
    return a.length > 0;
  });

  return {
    id: String(row[BOOK_COLUMNS.ID] || ''),
    title: String(row[BOOK_COLUMNS.TITLE] || ''),
    isbn: String(row[BOOK_COLUMNS.ISBN] || ''),
    authors: authors,
    publisher: String(row[BOOK_COLUMNS.PUBLISHER] || ''),
    publishedDate: String(row[BOOK_COLUMNS.PUBLISHED_DATE] || ''),
    imageUrl: String(row[BOOK_COLUMNS.IMAGE_URL] || ''),
    googleBooksId: String(row[BOOK_COLUMNS.GOOGLE_BOOKS_ID] || ''),
    createdAt: String(row[BOOK_COLUMNS.CREATED_AT] || ''),
    createdBy: String(row[BOOK_COLUMNS.CREATED_BY] || ''),
    genre: String(row[BOOK_COLUMNS.GENRE] || ''),
    titleKana: String(row[BOOK_COLUMNS.TITLE_KANA] || ''),
  };
}

/**
 * 書籍オブジェクトを行データに変換
 */
function bookToRow(book) {
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
