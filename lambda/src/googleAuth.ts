import { AwsClient, GoogleAuth } from 'google-auth-library';
import type { AwsClientOptions } from 'google-auth-library/build/src/auth/awsclient';

let authClient: AwsClient | GoogleAuth | null = null;

/**
 * ローカル環境かどうかを判定
 * GOOGLE_APPLICATION_CREDENTIALS が設定されている場合はローカル環境とみなす
 */
function isLocalEnv(): boolean {
  return !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

/**
 * Workload Identity Federation の認証情報を構築
 * 環境変数から WIF パラメータを読み取り、AWS → GCP の連携設定を返す
 */
function getWifCredentials(): AwsClientOptions {
  const projectNumber = process.env.GCP_PROJECT_NUMBER;
  const poolId = process.env.GCP_WIF_POOL_ID;
  const providerId = process.env.GCP_WIF_PROVIDER_ID;
  const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;

  if (!projectNumber || !poolId || !providerId || !serviceAccountEmail) {
    throw new Error(
      'Workload Identity Federation の環境変数が不足しています: ' +
      'GCP_PROJECT_NUMBER, GCP_WIF_POOL_ID, GCP_WIF_PROVIDER_ID, GCP_SERVICE_ACCOUNT_EMAIL'
    );
  }

  return {
    type: 'external_account',
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: 'urn:ietf:params:aws:token-type:aws4_request',
    token_url: 'https://sts.googleapis.com/v1/token',
    credential_source: {
      environment_id: 'aws1',
      regional_cred_verification_url:
        'https://sts.{region}.amazonaws.com?Action=GetCallerIdentity&Version=2011-06-15',
    },
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
  };
}

/**
 * GCP 認証クライアントを取得（シングルトン）
 * ローカル環境: GOOGLE_APPLICATION_CREDENTIALS を使用した GoogleAuth
 * 本番環境: Workload Identity Federation を使用した AwsClient
 */
export function getAuthClient(): AwsClient | GoogleAuth {
  if (authClient) return authClient;

  if (isLocalEnv()) {
    authClient = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/books',
      ],
    });
  } else {
    const credentials = getWifCredentials();
    const client = new AwsClient(credentials);
    client.scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/books',
    ];
    authClient = client;
  }

  return authClient;
}
