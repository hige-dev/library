# Library API - Lambda Backend

書籍管理システムのバックエンドAPI。Google スプレッドシートをデータストアとして使用。

## アーキテクチャ

```
ブラウザ → CloudFront (WAF) → OAC → Lambda Function URL (AWS_IAM)
                                       ↓
                                Google Sheets API (サービスアカウント)
```

## 前提条件

- Node.js 24+
- AWS CLI（設定済み）
- AWS SAM CLI
- Google Cloud プロジェクト

## セットアップ

### 1. Google サービスアカウントの作成

1. [Google Cloud Console](https://console.cloud.google.com/) → 「IAMと管理」→「サービスアカウント」
2. サービスアカウントを作成
3. 「鍵」タブ → 「鍵を追加」→「新しい鍵を作成」→ JSON
4. ダウンロードしたJSONファイルの内容をメモ

### 2. スプレッドシートの共有設定

1. 書籍管理用のスプレッドシートを開く
2. 「共有」→ サービスアカウントのメールアドレス（`xxx@xxx.iam.gserviceaccount.com`）を追加
3. 権限: **編集者**

### 3. Google Sheets API の有効化

1. Google Cloud Console → 「APIとサービス」→「ライブラリ」
2. 「Google Sheets API」を検索して有効化

### 4. Parameter Store にサービスアカウントキーを登録

サービスアカウントキー（JSON）を AWS Systems Manager Parameter Store に SecureString として保存する。

```bash
aws ssm put-parameter \
  --name "/library/google-service-account-key" \
  --type SecureString \
  --value "$(cat サービスアカウントキー.json)"
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
#   ServiceAccountKeyParam: Parameter Store名（デフォルト: /library/google-service-account-key）
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
| `SERVICE_ACCOUNT_KEY_PARAM` | Parameter Store名 |
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
