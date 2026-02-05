/**
 * レビューサービス
 * レビューのCRUD操作を提供
 */

/**
 * 全書籍のレビュー統計を取得
 * @returns {Object} bookIdをキーとした統計情報 {averageRating, reviewCount}
 */
function getAllReviewStats() {
  var sheet = getOrCreateSheet(SHEET_NAMES.REVIEWS);
  var data = sheet.getDataRange().getValues();

  var stats = {};

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var bookId = row[REVIEW_COLUMNS.BOOK_ID];
    var rating = row[REVIEW_COLUMNS.RATING];

    if (!stats[bookId]) {
      stats[bookId] = { total: 0, count: 0 };
    }
    stats[bookId].total += rating;
    stats[bookId].count += 1;
  }

  var result = {};
  for (var bookId in stats) {
    result[bookId] = {
      averageRating: stats[bookId].total / stats[bookId].count,
      reviewCount: stats[bookId].count,
    };
  }

  return result;
}

/**
 * 書籍のレビュー一覧を取得
 * @param {string} bookId - 書籍ID
 * @returns {Array} レビュー一覧
 */
function getReviewsByBookId(bookId) {
  var sheet = getOrCreateSheet(SHEET_NAMES.REVIEWS);
  var data = sheet.getDataRange().getValues();

  var reviews = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[REVIEW_COLUMNS.BOOK_ID] === bookId) {
      reviews.push(rowToReview(row));
    }
  }

  return reviews;
}

/**
 * ユーザーの特定書籍に対するレビューを取得
 * @param {string} bookId - 書籍ID
 * @param {string} email - ユーザーメールアドレス
 * @returns {Object|null} レビューまたはnull
 */
function getReviewByBookIdAndUser(bookId, email) {
  var sheet = getOrCreateSheet(SHEET_NAMES.REVIEWS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[REVIEW_COLUMNS.BOOK_ID] === bookId && row[REVIEW_COLUMNS.CREATED_BY] === email) {
      return rowToReview(row);
    }
  }

  return null;
}

/**
 * レビューを作成または更新（upsert）
 * @param {Object} reviewData - レビューデータ {bookId, rating, comment}
 * @param {string} userEmail - ユーザーメールアドレス
 * @returns {Object} 作成/更新されたレビュー
 */
function createOrUpdateReview(reviewData, userEmail) {
  var sheet = getOrCreateSheet(SHEET_NAMES.REVIEWS);
  var data = sheet.getDataRange().getValues();
  var now = getCurrentISOString();

  // 既存のレビューを検索
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[REVIEW_COLUMNS.BOOK_ID] === reviewData.bookId && row[REVIEW_COLUMNS.CREATED_BY] === userEmail) {
      // 更新
      var review = {
        id: row[REVIEW_COLUMNS.ID],
        bookId: reviewData.bookId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        createdBy: userEmail,
        createdAt: row[REVIEW_COLUMNS.CREATED_AT],
        updatedAt: now,
      };

      var rowIndex = i + 1;
      sheet.getRange(rowIndex, 1, 1, 7).setValues([reviewToRow(review)]);
      return review;
    }
  }

  // 新規作成
  var newReview = {
    id: generateUUID(),
    bookId: reviewData.bookId,
    rating: reviewData.rating,
    comment: reviewData.comment,
    createdBy: userEmail,
    createdAt: now,
    updatedAt: now,
  };

  sheet.appendRow(reviewToRow(newReview));
  return newReview;
}

/**
 * レビューを削除（本人のみ）
 * @param {string} id - レビューID
 * @param {string} userEmail - ユーザーメールアドレス
 */
function deleteReview(id, userEmail) {
  var sheet = getOrCreateSheet(SHEET_NAMES.REVIEWS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[REVIEW_COLUMNS.ID] === id) {
      if (row[REVIEW_COLUMNS.CREATED_BY] !== userEmail) {
        throw new Error('自分のレビューのみ削除できます');
      }
      sheet.deleteRow(i + 1);
      return;
    }
  }

  throw new Error('レビューが見つかりません');
}

/**
 * スプレッドシートの行をレビューオブジェクトに変換
 * @param {Array} row - スプレッドシートの行データ
 * @returns {Object} レビューオブジェクト
 */
function rowToReview(row) {
  return {
    id: row[REVIEW_COLUMNS.ID],
    bookId: row[REVIEW_COLUMNS.BOOK_ID],
    rating: row[REVIEW_COLUMNS.RATING],
    comment: row[REVIEW_COLUMNS.COMMENT],
    createdBy: row[REVIEW_COLUMNS.CREATED_BY],
    createdAt: row[REVIEW_COLUMNS.CREATED_AT],
    updatedAt: row[REVIEW_COLUMNS.UPDATED_AT],
  };
}

/**
 * レビューオブジェクトをスプレッドシートの行に変換
 * @param {Object} review - レビューオブジェクト
 * @returns {Array} スプレッドシートの行データ
 */
function reviewToRow(review) {
  return [
    review.id,
    review.bookId,
    review.rating,
    review.comment,
    review.createdBy,
    review.createdAt,
    review.updatedAt,
  ];
}
