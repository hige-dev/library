/**
 * Google Books API サービス
 */

var GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Google Books APIキーを取得
 */
function getGoogleBooksApiKey() {
  return PropertiesService.getScriptProperties().getProperty('GOOGLE_BOOKS_API_KEY') || '';
}

/**
 * デバッグ用：APIキーが設定されているか確認
 * スクリプトエディタから手動実行
 */
function testApiKey() {
  var key = getGoogleBooksApiKey();
  console.log('API Key exists: ' + (key ? 'Yes (' + key.substring(0, 10) + '...)' : 'No'));

  // テスト検索
  try {
    var result = searchGoogleBooks('test');
    console.log('Search result: ' + result.totalItems + ' items found');
  } catch (e) {
    console.log('Error: ' + e.message);
  }
}

/**
 * Google Books APIで書籍を検索
 */
function searchGoogleBooks(query) {
  var apiKey = getGoogleBooksApiKey();
  var url = GOOGLE_BOOKS_API + '?q=' + encodeURIComponent(query) + '&maxResults=10&langRestrict=ja';

  if (apiKey) {
    url += '&key=' + apiKey;
  }

  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
  });

  var statusCode = response.getResponseCode();
  if (statusCode !== 200) {
    throw new Error('Google Books API error: ' + statusCode);
  }

  return JSON.parse(response.getContentText());
}

/**
 * Google Books APIで書籍詳細を取得
 */
function getGoogleBookById(volumeId) {
  var apiKey = getGoogleBooksApiKey();
  var url = GOOGLE_BOOKS_API + '/' + volumeId;

  if (apiKey) {
    url += '?key=' + apiKey;
  }

  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
  });

  var statusCode = response.getResponseCode();
  if (statusCode !== 200) {
    throw new Error('Google Books API error: ' + statusCode);
  }

  return JSON.parse(response.getContentText());
}
