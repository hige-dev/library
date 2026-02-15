import type { Config } from './types';

export const config: Config = {
  imageStorage: (import.meta.env.VITE_IMAGE_STORAGE as 'local' | 's3') || 'local',
  imageBaseUrl: import.meta.env.VITE_IMAGE_BASE_URL || '/images',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  apiUrl: import.meta.env.VITE_API_URL || '',
  allowedDomains: (import.meta.env.VITE_ALLOWED_DOMAINS || '').split(',').filter(Boolean),
};

/**
 * 画像URLを取得する
 * @param imageUrl スプレッドシートに保存されているimageUrl
 * @returns 環境に応じた画像URL
 */
export function getImageUrl(imageUrl: string | undefined | null): string {
  if (!imageUrl) {
    return '/images/no-image.svg';
  }

  // 既に完全なURLの場合（Google Books APIのURL等）はそのまま返す
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // 相対パスの場合は環境に応じたベースURLを付与
  return `${config.imageBaseUrl}/${imageUrl}`;
}

/**
 * ドメインが許可リストに含まれているか確認
 * @param email メールアドレス
 * @returns 許可されている場合はtrue
 */
export function isAllowedDomain(email: string): boolean {
  if (config.allowedDomains.length === 0) {
    return true; // 許可ドメインが設定されていない場合は全て許可
  }

  const domain = email.split('@')[1];
  return config.allowedDomains.includes(domain);
}
