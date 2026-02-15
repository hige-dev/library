import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
 */
export async function authenticateRequest(token: string | undefined): Promise<AuthResult> {
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
