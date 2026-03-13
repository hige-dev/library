import { OAuth2Client } from 'google-auth-library';

const skipAuth = process.env.SKIP_AUTH === 'true';

if (!skipAuth && !process.env.GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID 環境変数が設定されていません');
}

const client = skipAuth ? null : new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface AuthUser {
  email: string;
  name: string;
  picture: string | null;
}

interface AuthResult {
  user: AuthUser | null;
  error: string | null;
}

/**
 * Google ID Token を検証
 */
async function verifyIdToken(token: string): Promise<AuthUser | null> {
  if (!client) return null;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified) {
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
 * 許可されたドメインを取得
 */
function getAllowedDomains(): string[] {
  const domains = process.env.ALLOWED_DOMAINS || '';
  return domains
    .split(',')
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
}

/**
 * リクエストを認証
 * SKIP_AUTH=true の場合はダミーユーザーで認証をスキップ
 */
export async function authenticateRequest(token: string | undefined): Promise<AuthResult> {
  if (skipAuth) {
    return {
      user: {
        email: process.env.DEV_USER_EMAIL || 'dev@example.com',
        name: 'Development User',
        picture: null,
      },
      error: null,
    };
  }

  if (!token) {
    return { user: null, error: 'Token required' };
  }

  const user = await verifyIdToken(token);
  if (!user) {
    return { user: null, error: 'Unauthorized' };
  }

  const allowedDomains = getAllowedDomains();
  if (allowedDomains.length > 0) {
    const emailDomain = user.email.split('@')[1];
    if (!allowedDomains.includes(emailDomain)) {
      return { user: null, error: 'Domain not allowed' };
    }
  }

  return { user, error: null };
}
