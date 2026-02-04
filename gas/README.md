# 書籍管理システム - Google Apps Script バックエンド

## セットアップ手順

### 1. Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. 「APIとサービス」→「ライブラリ」で以下のAPIを有効化:
   - Google Sheets API
   - Google Books API

### 2. スプレッドシートの準備

1. Google スプレッドシートを新規作成
2. スプレッドシートのIDをメモ（URLの `/d/` と `/edit` の間の文字列）

### 3. clasp のセットアップ

```bash
# clasp をグローバルインストール
npm install -g @google/clasp

# Googleアカウントでログイン
clasp login

# GASプロジェクトを作成
clasp create-script --type webapp --title "Library API"

# または既存のプロジェクトをクローン
clasp clone-script <scriptId>
```

### 4. 設定ファイルの準備

```bash
# .clasp.json を作成
cp .clasp.json.example .clasp.json

# scriptId を編集
```

### 5. スクリプトプロパティの設定

1. GASプロジェクトを開く: `clasp open-script`
2. 「プロジェクトの設定」→「スクリプト プロパティ」
3. 以下のプロパティを追加:
   - `SPREADSHEET_ID`: スプレッドシートのID

### 6. デプロイ

```bash
# コードをプッシュ
clasp push

# 初期セットアップを実行（スクリプトエディタで手動実行）
# setupSpreadsheet() を実行

# Webアプリとしてデプロイ
clasp create-deployment --description "v1.0.0"
```

### 7. デプロイURLの取得

1. スクリプトエディタで「デプロイ」→「デプロイを管理」
2. ウェブアプリのURLをコピー
3. フロントエンドの `.env` ファイルに設定

## API仕様

### 書籍API

| アクション | パラメータ | 説明 |
|------------|------------|------|
| getBooks | - | 全書籍を取得 |
| searchBooks | query | 書籍を検索 |
| createBook | book | 書籍を登録 |
| createBooks | books | 複数書籍を一括登録 |
| deleteBook | id | 書籍を削除 |

### 貸出API

| アクション | パラメータ | 説明 |
|------------|------------|------|
| getLoans | - | 全貸出を取得 |
| getLoanByBookId | bookId | 書籍の貸出状況を取得 |
| borrowBook | bookId, borrower | 貸出を作成 |
| returnBook | loanId | 返却処理 |

### リクエスト例

```javascript
// 書籍一覧を取得
fetch(GAS_URL, {
  method: 'POST',
  body: JSON.stringify({ action: 'getBooks' })
})

// 書籍を登録
fetch(GAS_URL, {
  method: 'POST',
  body: JSON.stringify({
    action: 'createBook',
    book: {
      title: '書籍タイトル',
      isbn: '1234567890123',
      authors: ['著者名'],
      publisher: '出版社',
      publishedDate: '2024-01-01',
      imageUrl: 'https://...',
      googleBooksId: 'xxx',
      createdBy: 'user@example.com'
    }
  })
})
```

## ディレクトリ構造

```
gas/
├── appsscript.json    # GASプロジェクト設定
├── .clasp.json        # clasp設定（要作成）
├── src/
│   ├── Config.ts      # 定数・設定
│   ├── Types.ts       # 型定義
│   ├── Utils.ts       # ユーティリティ関数
│   ├── BookService.ts # 書籍サービス
│   ├── LoanService.ts # 貸出サービス
│   └── Main.ts        # エントリーポイント
└── README.md
```
