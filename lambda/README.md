# Library API - Lambda Backend

書籍管理システムのバックエンドAPI。Google スプレッドシートをデータストアとして使用。

## アーキテクチャ

```
ブラウザ → CloudFront (WAF) → OAC → Lambda Function URL (AWS_IAM)
                                       ↓
                                Google Sheets API (Workload Identity Federation)
```

## 前提条件

- Node.js 24+
- AWS CLI（設定済み）
- AWS SAM CLI
- Google Cloud プロジェクト

## セットアップ

### 1. Google サービスアカウントの作成

1. [Google Cloud Console](https://console.cloud.google.com/) → 「IAMと管理」→「サービスアカウント」
2. サービスアカウントを作成（鍵の作成は不要）
3. サービスアカウントのメールアドレスをメモ

### 2. スプレッドシートの共有設定

1. 書籍管理用のスプレッドシートを開く
2. 「共有」→ サービスアカウントのメールアドレス（`xxx@xxx.iam.gserviceaccount.com`）を追加
3. 権限: **編集者**

### 3. Google Sheets API と IAM Credentials API の有効化

1. Google Cloud Console → 「APIとサービス」→「ライブラリ」
2. 「Google Sheets API」を検索して有効化
3. 「IAM Service Account Credentials API」を検索して有効化

### 4. Workload Identity Federation の設定

サービスアカウントキーの代わりに、AWS IAM ロールで GCP を認証する。
鍵ファイルの管理が不要になり、セキュリティが向上する。

#### 4-1. 前提情報の確認

以下の値を事前に確認しておく。

| 項目 | 確認方法 | 例 |
|------|----------|-----|
| GCPプロジェクトID | Cloud Console トップ | `my-library-project` |
| GCPプロジェクト番号 | 下記コマンド | `123456789012` |
| AWSアカウントID | `aws sts get-caller-identity` | `111122223333` |
| サービスアカウント<br>メールアドレス | 手順1で作成 | `library-sa@<br>my-project.iam.<br>gserviceaccount.com` |

```bash
# GCPプロジェクト番号を確認
gcloud projects describe <PROJECT_ID> \
  --format='value(projectNumber)'
```

#### 4-2. Workload Identity Pool の作成

```bash
gcloud iam workload-identity-pools create library-pool \
  --location="global" \
  --display-name="Library API Pool" \
  --project=<PROJECT_ID>
```

#### 4-3. AWS プロバイダの追加

```bash
gcloud iam workload-identity-pools providers create-aws library-aws \
  --location="global" \
  --workload-identity-pool="library-pool" \
  --account-id="<AWSアカウントID>" \
  --project=<PROJECT_ID>
```

#### 4-4. サービスアカウントへの権限借用を許可

Lambda 実行ロールからサービスアカウントを借用できるよう設定する。

```bash
# Lambda実行ロール名を確認（SAMデプロイ後）
aws cloudformation describe-stacks \
  --stack-name library-api \
  --query 'Stacks[0].Outputs'

# 権限借用を許可
gcloud iam service-accounts add-iam-policy-binding \
  <SA_EMAIL> \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/library-pool/attribute.aws_role/arn:aws:sts::<AWSアカウントID>:assumed-role/<Lambda実行ロール名>" \
  --project=<PROJECT_ID>
```

> **注意**: `<Lambda実行ロール名>` は SAM が自動生成する IAM ロール名
> （例: `library-api-LibraryApiFunctionRole-XXXX`）。
> 初回は先にSAMデプロイ（手順6）を行い、ロール名を確認してからこの手順を実行する。

#### 4-5. 設定の確認

```bash
# Pool の確認
gcloud iam workload-identity-pools describe library-pool \
  --location="global" --project=<PROJECT_ID>

# Provider の確認
gcloud iam workload-identity-pools providers describe library-aws \
  --location="global" \
  --workload-identity-pool="library-pool" \
  --project=<PROJECT_ID>
```

### 5. ビルド

```bash
cd lambda
npm install
npm run build
```

### 6. SAM デプロイ

```bash
# 初回デプロイ（対話形式で設定）
sam deploy --guided

# パラメータの入力:
#   SpreadsheetId: スプレッドシートのID
#   GcpProjectNumber: GCPプロジェクト番号
#   GcpWifPoolId: Workload Identity Pool ID（例: library-pool）
#   GcpWifProviderId: Workload Identity Provider ID（例: library-aws）
#   GcpServiceAccountEmail: GCPサービスアカウントのメールアドレス
#   AllowedDomains: 許可ドメイン（例: example.com）
#   GoogleClientId: Google OAuthクライアントID

# 2回目以降
sam deploy
```

### 7. CloudFront OAC の設定

Lambda Function URLへの直接アクセスを防ぎ、CloudFront経由のみ許可する。

#### 7-1. OACの作成

```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "library-api-oac",
    "Description": "OAC for Library API Lambda",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "lambda"
  }'
```

出力される `Id` をメモ。

#### 7-2. CloudFront ディストリビューションにオリジンを追加

1. CloudFront コンソール → 対象ディストリビューション
2. 「オリジン」タブ → 「オリジンを作成」
   - オリジンドメイン: Lambda Function URLのドメイン部分
     （例: `xxxxxxxxxx.lambda-url.ap-northeast-1.on.aws`）
   - オリジンアクセス: 「Origin access control settings」を選択
   - OAC: 上で作成した `library-api-oac` を選択
3. 「ビヘイビア」タブ → 「ビヘイビアを作成」
   - パスパターン: `/api`（または適切なパス）
   - オリジン: 上で作成したLambdaオリジン
   - ビューワープロトコルポリシー: HTTPS only
   - 許可されたHTTPメソッド: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - キャッシュポリシー: CachingDisabled
   - オリジンリクエストポリシー: AllViewerExceptHostHeader

#### 7-3. Lambda リソースポリシーの追加

CloudFrontからのアクセスを許可する（SAMデプロイ後に実行）。

```bash
aws lambda add-permission \
  --function-name <Lambda関数名> \
  --statement-id cloudfront-oac \
  --action lambda:InvokeFunctionUrl \
  --principal cloudfront.amazonaws.com \
  --source-arn arn:aws:cloudfront::<AWSアカウントID>:distribution/<ディストリビューションID>
```

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `SPREADSHEET_ID` | Google スプレッドシートのID |
| `GCP_PROJECT_NUMBER` | GCPプロジェクト番号 |
| `GCP_WIF_POOL_ID` | Workload Identity Pool ID |
| `GCP_WIF_PROVIDER_ID` | Workload Identity Provider ID |
| `GCP_SERVICE_ACCOUNT_EMAIL` | GCPサービスアカウントのメールアドレス |
| `ALLOWED_DOMAINS` | 許可ドメイン（カンマ区切り、空で全許可） |
| `GOOGLE_CLIENT_ID` | Google OAuthクライアントID（ID Token検証用） |
| `ALLOWED_ORIGIN` | CORSで許可するオリジン（デフォルト: `*`） |

## 開発

```bash
# ビルド
npm run build

# ローカルテスト（SAM CLI）
sam local invoke LibraryApiFunction \
  --event events/test.json

# ログ確認
sam logs --name LibraryApiFunction --tail
```

## フロントエンドのデプロイ

[frontend/README.md](../frontend/README.md) を参照。
