# 書籍管理システム

組織向けの書籍貸出管理システムです。Google認証で特定ドメインのユーザーのみがアクセスでき、書籍の登録・検索・貸出管理が行えます。

## 機能

- **書籍一覧**: 登録済み書籍の閲覧・検索・ジャンルフィルター・ソート
  （登録日順・レビュー件数順・レビュー評価順）
- **書籍登録**: タイトル/ISBN検索によるGoogle Books API自動取得、または手動入力（admin のみ）
- **CSV一括登録**: タイトル一覧から一括登録（admin のみ）
- **貸出管理**: 借りた人・貸出日・返却日を記録
- **レビュー**: 書籍への星評価（5段階）・コメント投稿・レビュー一覧

## 技術構成

| 層 | 本番 | 開発 |
|----|------|------|
| フロントエンド | React + TypeScript (S3+CloudFront) | React + TypeScript (Vite) |
| バックエンド | AWS Lambda (Function URL + CloudFront OAC) | 同左（SAM CLI） |
| データベース | Google スプレッドシート | 同左（開発用シート） |
| 認証 | Google Identity Services | 同左 |

## ディレクトリ構造

```
library/
├── frontend/           # React フロントエンド
│   ├── src/
│   │   ├── components/ # 共通コンポーネント
│   │   ├── pages/      # ページコンポーネント
│   │   ├── services/   # API クライアント
│   │   ├── contexts/   # React Context
│   │   └── types/      # 型定義
│   └── public/
│       └── images/     # 開発用画像
├── lambda/             # Lambda バックエンド
│   ├── src/
│   └── template.yaml   # SAM テンプレート
├── scripts/            # デプロイスクリプト
└── README.md
```

## セットアップ

### 前提条件

- Node.js 24+
- npm
- AWS CLI（設定済み）
- AWS SAM CLI
- Googleアカウント

### 1. Google Cloud Console の設定

1. [Google Cloud Console](https://console.cloud.google.com/) で新規プロジェクトを作成
2. 「APIとサービス」→「ライブラリ」で以下を有効化:
   - Google Sheets API
   - Google Books API
3. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みJavaScript生成元:
     - `http://localhost:5173`（開発用）
     - `https://your-domain.com`（本番用）
   - 承認済みリダイレクトURI: 空でOK（ポップアップモードのため不要）
4. クライアントIDをメモ

### 2. Google スプレッドシートの準備

1. 新規スプレッドシートを作成
2. URLからスプレッドシートIDをコピー（`/d/` と `/edit` の間の文字列）
3. 以下の3つのシートを作成し、1行目にヘッダーを設定:

**booksシート:**
```
id,title,isbn,authors,publisher,publishedDate,imageUrl,googleBooksId,createdAt,createdBy,genre,titleKana
```

**loansシート:**
```
id,bookId,borrower,borrowedAt,returnedAt
```

**reviewsシート:**
```
id,bookId,rating,comment,createdBy,createdAt,updatedAt
```

**usersシート:**
```
email,role,createdAt
```
- `role`: `admin` または `user`
- 管理者のみ登録すればOK（未登録ユーザーは `user` として扱われる）

### 3. Lambda バックエンドのセットアップ

詳細は [lambda/README.md](./lambda/README.md) を参照。

```bash
cd lambda
npm install
npm run build
sam deploy --guided
```

### 4. フロントエンドのセットアップ

```bash
cd frontend
npm install

# 環境変数を設定
cp .env.example .env.development
```

`.env.development` を編集:

```
VITE_GOOGLE_CLIENT_ID=<OAuthクライアントID>
VITE_API_URL=<CloudFront経由のAPI URL>
VITE_ALLOWED_DOMAINS=              # 空欄で全ドメイン許可
VITE_GOOGLE_BOOKS_API_KEY=<Google Books APIキー>  # 任意（レート制限対策）
```

### 5. 開発サーバーの起動

```bash
cd frontend
npm run dev
```

http://localhost:5173 でアクセスできます。

## 本番デプロイ

### デプロイスクリプト

```bash
# Lambda バックエンド（ビルド＆デプロイ）
./scripts/deploy-backend.sh

# フロントエンド（ビルド＆S3アップロード＆CloudFrontキャッシュ無効化）
./scripts/deploy-frontend.sh <S3バケット名> <CloudFront Distribution ID> [S3プレフィックス]
```

### 手動デプロイ

```bash
# Lambda
cd lambda && npm run build && sam deploy

# フロントエンド
cd frontend && npm run build
aws s3 sync dist/ s3://<S3バケット名> --delete
aws cloudfront create-invalidation --distribution-id <Distribution ID> --paths "/*"
```

### 初回デプロイ時

```bash
# フロントエンド本番用環境変数を設定
cd frontend
cp .env.example .env.production
# .env.production を編集
```

## 権限マトリックス

| 操作 | user | admin |
|------|------|-------|
| 書籍閲覧・検索 | o | o |
| 書籍登録 | x | o |
| 書籍削除 | x | o |
| 貸出（借りる） | o | o |
| 返却 | 自分のみ | 全員分 |
| レビュー投稿・編集 | o | o |
| レビュー削除 | 自分のみ | 全員分 |

未登録ユーザーは `user` として扱われます。

## 開発時の注意点

### Google Books API

- 無料（1日1,000リクエスト）
- APIキーなしでも動作するが、レート制限が厳しい
- 429エラーが頻発する場合はAPIキーを設定

### 画像の扱い

- 現在はGoogle Books APIのURLをそのまま使用
- 本番で大規模利用する場合はS3への保存を検討

## ライセンス

MIT
