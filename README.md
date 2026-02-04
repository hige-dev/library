# 書籍管理システム

組織向けの書籍貸出管理システムです。Google認証で特定ドメインのユーザーのみがアクセスでき、書籍の登録・検索・貸出管理が行えます。

## 機能

- **書籍一覧**: 登録済み書籍の閲覧・検索
- **書籍登録**: タイトルからGoogle Books APIで画像・ISBN自動取得
- **CSV一括登録**: タイトル一覧から一括登録
- **貸出管理**: 借りた人・貸出日・返却日を記録

## 技術構成

| 層 | 本番 | 開発 |
|----|------|------|
| フロントエンド | React + TypeScript (S3+CF) | React + TypeScript (Vite) |
| バックエンド | Google Apps Script | 同左 |
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
├── gas/                # Google Apps Script バックエンド
│   └── src/
└── README.md
```

## セットアップ

### 前提条件

- Node.js 18+
- Google Cloud Console プロジェクト
  - OAuth 2.0 クライアントID
  - Google Books API 有効化
- Google スプレッドシート

### 1. フロントエンドのセットアップ

```bash
cd frontend
npm install

# 環境変数を設定
cp .env.example .env.development
# .env.development を編集
```

`.env.development` の設定項目:

```
VITE_GOOGLE_CLIENT_ID=<OAuth クライアントID>
VITE_GAS_API_URL=<GAS Web App URL>
VITE_ALLOWED_DOMAINS=<許可するドメイン>
```

### 2. GASのセットアップ

詳細は [gas/README.md](./gas/README.md) を参照。

```bash
cd gas

# clasp でGASプロジェクトを作成
clasp create --type webapp --title "Library API"

# コードをプッシュ
clasp push

# Webアプリとしてデプロイ
clasp deploy
```

### 3. 開発サーバーの起動

```bash
cd frontend
npm run dev
```

http://localhost:5173 でアクセスできます。

## 本番デプロイ

### フロントエンド (AWS S3 + CloudFront)

```bash
cd frontend
npm run build
# dist/ フォルダをS3にアップロード
```

### GAS

```bash
cd gas
clasp deploy --description "Production v1.0.0"
```

## 開発時の注意点

### 画像の扱い

- **開発時**: Google Books APIのURLをそのまま使用
- **本番時**: S3 + CloudFront経由で配信

### CORS

GASはCORSヘッダーを自動で付与しないため、フロントエンドからの呼び出しは `Content-Type: text/plain` で行います。

## ライセンス

MIT
