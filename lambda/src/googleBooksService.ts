import { google, books_v1 } from 'googleapis';
import { getAuthClient } from './googleAuth';

let booksClient: books_v1.Books | null = null;

function getBooksClient(): books_v1.Books {
  if (booksClient) return booksClient;
  booksClient = google.books({ version: 'v1', auth: getAuthClient() });
  return booksClient;
}

/**
 * Google Books API で書籍を検索
 */
export async function searchGoogleBooks(query: string) {
  const client = getBooksClient();
  const result = await client.volumes.list({
    q: query,
    maxResults: 10,
    langRestrict: 'ja',
  });

  return {
    totalItems: result.data.totalItems || 0,
    items: (result.data.items || []).map(mapVolume),
  };
}

/**
 * Google Books API で書籍詳細を取得
 */
export async function getGoogleBookById(volumeId: string) {
  const client = getBooksClient();
  const result = await client.volumes.get({ volumeId });
  return mapVolume(result.data);
}

/** API レスポンスをフロントエンド用の型にマッピング */
function mapVolume(vol: books_v1.Schema$Volume) {
  return {
    id: vol.id || '',
    volumeInfo: {
      title: vol.volumeInfo?.title || '',
      authors: vol.volumeInfo?.authors || undefined,
      publisher: vol.volumeInfo?.publisher || undefined,
      publishedDate: vol.volumeInfo?.publishedDate || undefined,
      industryIdentifiers: vol.volumeInfo?.industryIdentifiers as
        Array<{ type: string; identifier: string }> | undefined,
      imageLinks: vol.volumeInfo?.imageLinks
        ? {
            thumbnail: vol.volumeInfo.imageLinks.thumbnail || undefined,
            smallThumbnail: vol.volumeInfo.imageLinks.smallThumbnail || undefined,
          }
        : undefined,
    },
  };
}
