import { AwsClient } from 'google-auth-library';
import type { AwsClientOptions } from 'google-auth-library/build/src/auth/awsclient';

let authClient: AwsClient | null = null;

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
 * WIF 認証クライアントを取得（シングルトン）
 */
export function getAuthClient(): AwsClient {
  if (authClient) return authClient;

  const credentials = getWifCredentials();
  authClient = new AwsClient(credentials);
  authClient.scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/books',
  ];

  return authClient;
}
