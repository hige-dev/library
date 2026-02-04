# 書籍管理システム - フロントエンド

React + TypeScript + Vite で構築されたSPAです。

## セットアップ

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.development
# .env.development を編集
```

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| VITE_GOOGLE_CLIENT_ID | Yes | Google OAuth クライアントID |
| VITE_GAS_API_URL | Yes | GAS Web App のURL |
| VITE_ALLOWED_DOMAINS | No | 許可するメールドメイン（カンマ区切り、空欄で全許可） |
| VITE_GOOGLE_BOOKS_API_KEY | No | Google Books APIキー（レート制限対策） |
| VITE_IMAGE_STORAGE | No | 画像ストレージ（local/s3、デフォルト: local） |
| VITE_IMAGE_BASE_URL | No | 画像のベースURL |

## 開発

```bash
# 開発サーバーを起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview

# Lint
npm run lint
```

## ディレクトリ構造

```
src/
├── components/       # 共通コンポーネント
│   ├── BookCard.tsx
│   ├── Header.tsx
│   ├── LoadingSpinner.tsx
│   └── LoginButton.tsx
├── pages/            # ページコンポーネント
│   ├── BookListPage.tsx
│   ├── BookDetailPage.tsx
│   ├── BookRegisterPage.tsx
│   ├── CsvRegisterPage.tsx
│   └── LoanListPage.tsx
├── services/         # APIクライアント
│   └── api.ts
├── contexts/         # React Context
│   └── AuthContext.tsx
├── hooks/            # カスタムフック
│   └── useDebounce.ts
├── types/            # 型定義
│   └── index.ts
├── config.ts         # 設定
├── App.tsx           # ルーティング
├── App.css           # スタイル
└── main.tsx          # エントリーポイント
```

## 主な機能

- **書籍一覧** - 検索、貸出状況フィルター、ジャンルフィルター
- **書籍詳細** - 貸出/返却/削除
- **書籍登録** - Google Books APIで自動検索
- **CSV一括登録** - タイトル一覧から一括登録
- **貸出履歴** - 貸出/返却履歴の一覧
