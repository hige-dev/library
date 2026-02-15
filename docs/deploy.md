# デプロイ手順書

## 目次

- [環境構成](#環境構成)
- [前提条件](#前提条件)
- [初回セットアップ](#初回セットアップ)
- [通常デプロイ](#通常デプロイ)
- [開発環境の利用](#開発環境の利用)
- [トラブルシューティング](#トラブルシューティング)

## 環境構成

Lambda エイリアスで dev/prd を分離しています。

```
[prd]
ブラウザ → CloudFront → OAC署名 → Lambda Function URL (prd alias, AWS_IAM)
                                     → Google Sheets (prd)
[dev]
localhost:5173 → Lambda Function URL ($LATEST, AUTH_TYPE=NONE)
                   → Google Sheets (dev)
```

| 項目 | prd | dev |
|------|-----|-----|
| Lambda バージョン | prd エイリアス（固定） | $LATEST |
| Function URL 認証 | AWS_IAM（OAC経由） | NONE（直接アクセス） |
| CORS | CloudFront ドメイン | localhost:5173 |
| スプレッドシート | 本番用 | 開発用（別シート） |
| フロントエンド | CloudFront + S3 | Vite dev server |

## 前提条件

- Node.js 24+
- AWS CLI（設定済み、jq インストール済み）
- AWS SAM CLI
- 以下の AWS / GCP リソースが構築済み:
  - CloudFront ディストリビューション + S3 バケット
  - Google Cloud プロジェクト（OAuth、Sheets API、WIF 設定済み）
  - 詳細は [lambda/README.md](../lambda/README.md) を参照

## 初回セットアップ

### 1. dev 用スプレッドシートの作成

1. 本番スプレッドシートを開き「ファイル」→「コピーを作成」
2. コピーしたスプレッドシートの URL からスプレッドシート ID をコピー
   （`/d/` と `/edit` の間の文字列）
3. GCP サービスアカウントに「編集者」権限で共有

### 2. 初回 SAM デプロイ（対話形式）

```bash
cd lambda
npm install
npm run build
sam deploy --guided
```

以下のパラメータを入力:

| パラメータ | 説明 | 例 |
|-----------|------|-----|
| `SpreadsheetId` | 本番スプレッドシート ID | `1QL6K-...` |
| `GcpProjectNumber` | GCP プロジェクト番号 | `794593267619` |
| `GcpWifPoolId` | WIF Pool ID | `library-pool` |
| `GcpWifProviderId` | WIF Provider ID | `library-aws` |
| `GcpServiceAccountEmail` | GCP サービスアカウント | `library-389@...` |
| `GoogleClientId` | Google OAuth クライアント ID | `794593...` |
| `AllowedDomains` | 許可ドメイン（カンマ区切り） | `example.com` |
| `AllowedOrigin` | CloudFront ドメイン | `https://d3ic...cloudfront.net` |

> `samconfig.toml` が生成され、以降は `sam deploy` のみでデプロイ可能になります。

### 3. CloudFront オリジンの更新

`AutoPublishAlias: prd` により Function URL のドメインが変わるため、
CloudFront のオリジン設定を更新します。

```bash
# prd エイリアスの Function URL を確認
aws cloudformation describe-stacks \
  --stack-name sam-app \
  --query 'Stacks[0].Outputs[?OutputKey==`FunctionUrl`].OutputValue' \
  --output text
```

1. CloudFront コンソール → 対象ディストリビューション
2. 「オリジン」タブ → Lambda オリジンを編集
3. オリジンドメインを上記の Function URL ドメインに変更

### 4. prd エイリアスへの CloudFront アクセス許可

```bash
aws lambda add-permission \
  --function-name <関数名> \
  --qualifier prd \
  --statement-id cloudfront-oac-prd \
  --action lambda:InvokeFunctionUrl \
  --principal cloudfront.amazonaws.com \
  --source-arn arn:aws:cloudfront::<AWSアカウントID>:distribution/<DistributionID>
```

### 5. dev 環境のセットアップ

```bash
DEV_SPREADSHEET_ID=<dev用スプレッドシートID> ./scripts/deploy-backend.sh
```

スクリプト完了時に表示される dev Function URL をメモします。

### 6. フロントエンド環境変数の設定

`frontend/.env.development` を編集:

```
VITE_API_URL=<表示された dev Function URL>
```

## 通常デプロイ

### バックエンド

```bash
DEV_SPREADSHEET_ID=<dev用スプレッドシートID> ./scripts/deploy-backend.sh
```

このスクリプトは以下を自動実行します:

1. TypeScript ビルド
2. `sam deploy`（prd エイリアスにバージョン固定）
3. `$LATEST` の環境変数を dev 用に上書き
4. dev 用 Function URL の作成（初回のみ）

> `DEV_SPREADSHEET_ID` は環境変数にエクスポートしておくと便利です:
> ```bash
> export DEV_SPREADSHEET_ID=<dev用スプレッドシートID>
> ```

### フロントエンド

```bash
./scripts/deploy-frontend.sh <S3バケット名> <CloudFront Distribution ID> [S3プレフィックス]
```

キャッシュ制御が自動適用されます:

| ファイル | キャッシュ |
|---------|-----------|
| ハッシュ付きアセット（JS/CSS等） | 1年間 immutable |
| `index.html` | キャッシュなし（常に最新） |

## 開発環境の利用

### 起動

```bash
cd frontend
npm run dev
```

http://localhost:5173 で起動し、dev 用 Lambda（`$LATEST`）に接続されます。

### dev 環境の特徴

- コード変更が prd に影響しない（prd はバージョン固定）
- dev 用スプレッドシートを使用（本番データに影響しない）
- `AUTH_TYPE=NONE` のため CloudFront/OAC 不要で直接アクセス可能
- Google ID Token 検証は dev でも有効（認証は必要）

### dev 用コードの反映

Lambda のコードを変更した場合、`$LATEST` に反映するには:

```bash
cd lambda
npm run build
sam deploy
```

> `sam deploy` 後に `$LATEST` の環境変数がリセットされます。
> `deploy-backend.sh` を使えば自動で dev 用に再設定されます。

## トラブルシューティング

### AutoPublishAlias 初回追加でデプロイ失敗

既存の `FunctionUrlConfig` との競合が原因です。

**対処法**: 段階的にデプロイします。

1. `template.yaml` から `FunctionUrlConfig` を一時削除
2. `sam deploy` を実行（エイリアスのみ作成）
3. `FunctionUrlConfig` を戻して再度 `sam deploy`

### dev Function URL で CORS エラー

Lambda 側の `ALLOWED_ORIGIN` と Function URL の CORS 設定の両方を確認:

```bash
# $LATEST の環境変数を確認
aws lambda get-function-configuration \
  --function-name <関数名> \
  --query 'Environment.Variables.ALLOWED_ORIGIN'

# dev Function URL の CORS 設定を確認
aws lambda get-function-url-config \
  --function-name <関数名> \
  --qualifier '$LATEST'
```

### prd で 403 エラー

CloudFront OAC のリソースポリシーがエイリアスに紐づいているか確認:

```bash
aws lambda get-policy \
  --function-name <関数名> \
  --qualifier prd
```

`cloudfront-oac-prd` の statement が存在しない場合は、
[初回セットアップの手順 4](#4-prd-エイリアスへの-cloudfront-アクセス許可) を実行してください。
