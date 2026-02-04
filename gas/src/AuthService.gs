/**
 * 認証サービス
 * Google ID Tokenの検証を行う
 */

/**
 * Google ID Tokenを検証
 * @param {string} token - ID Token
 * @returns {Object|null} - 検証成功時はユーザー情報、失敗時はnull
 */
function verifyIdToken(token) {
  if (!token) {
    return null;
  }

  try {
    // Googleのtokeninfoエンドポイントで検証
    var response = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
      { muteHttpExceptions: true }
    );

    var statusCode = response.getResponseCode();
    if (statusCode !== 200) {
      console.error('Token verification failed: HTTP ' + statusCode);
      return null;
    }

    var payload = JSON.parse(response.getContentText());

    // 必須フィールドの確認
    if (!payload.email || !payload.email_verified) {
      console.error('Token verification failed: email not verified');
      return null;
    }

    // 有効期限の確認（tokeninfoは期限切れの場合エラーを返すが、念のため）
    var exp = parseInt(payload.exp, 10);
    if (exp && exp * 1000 < Date.now()) {
      console.error('Token verification failed: token expired');
      return null;
    }

    return {
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || null,
    };
  } catch (e) {
    console.error('Token verification error:', e);
    return null;
  }
}

/**
 * リクエストからユーザーを認証
 * @param {Object} request - リクエストオブジェクト
 * @returns {Object} - { user: User | null, error: string | null }
 */
function authenticateRequest(request) {
  var token = request.token;

  if (!token) {
    return { user: null, error: 'Token required' };
  }

  var user = verifyIdToken(token);

  if (!user) {
    return { user: null, error: 'Unauthorized' };
  }

  // ドメイン制限（オプション）
  var allowedDomains = getAllowedDomains();
  if (allowedDomains.length > 0) {
    var emailDomain = user.email.split('@')[1];
    if (allowedDomains.indexOf(emailDomain) === -1) {
      return { user: null, error: 'Domain not allowed' };
    }
  }

  return { user: user, error: null };
}

/**
 * 許可されたドメインを取得
 * スクリプトプロパティから取得（カンマ区切り）
 */
function getAllowedDomains() {
  var props = PropertiesService.getScriptProperties();
  var domains = props.getProperty('ALLOWED_DOMAINS') || '';
  return domains.split(',').map(function(d) {
    return d.trim();
  }).filter(function(d) {
    return d.length > 0;
  });
}
