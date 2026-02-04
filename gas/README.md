# 書籍管理システム - Google Apps Script バックエンド

## セットアップ手順

### 1. clasp のセットアップ

```bash
# clasp をグローバルインストール
npm install -g @google/clasp

# Googleアカウントでログイン
clasp login

# GASプロジェクトを作成
clasp create --type webapp --title "Library API"

# または既存のプロジェクトをクローン
clasp clone <scriptId>
```

### 2. 設定ファイルの準備

```bash
# .clasp.json を作成（clasp createで自動生成される）
# 既存プロジェクトの場合:
cp .clasp.json.example .clasp.json
# scriptId を編集
```

### 3. スクリプトプロパティの設定

1. GASプロジェクトを開く: `clasp open`
2. 「プロジェクトの設定」→「スクリプト プロパティ」
3. 以下のプロパティを追加:
   - `SPREADSHEET_ID`: スプレッドシートのID
   - `ALLOWED_DOMAINS`: 許可するメールドメイン（カンマ区切り、任意）
     - 例: `example.com,company.co.jp`
     - 空欄で全ドメイン許可

### 4. デプロイ

```bash
# コードをプッシュ
clasp push

# Webアプリとしてデプロイ
clasp deploy --description "v1.0.0"
```

または `./deploy.sh` を使用（デプロイURLを自動でfrontendの.envに反映）

### 5. Web App の設定

スクリプトエディタで「デプロイ」→「デプロイを管理」→「編集」:
- 実行ユーザー: **自分**
- アクセスできるユーザー: **全員**（CORS対応のため必須）

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
      createdBy: 'user@example.com',
      genre: '',
      titleKana: ''
    }
  })
})
```

## ディレクトリ構造

```
gas/
├── appsscript.json       # GASプロジェクト設定
├── .clasp.json           # clasp設定（要作成）
├── .clasp.json.example   # clasp設定のサンプル
├── deploy.sh             # デプロイスクリプト
├── src/
│   ├── Config.gs         # 定数・設定
│   ├── Utils.gs          # ユーティリティ関数
│   ├── AuthService.gs    # 認証サービス（JWT検証）
│   ├── BookService.gs    # 書籍サービス
│   ├── LoanService.gs    # 貸出サービス
│   └── Main.gs           # エントリーポイント
└── README.md
```

## トラブルシューティング

### CORS エラー

- Web Appのアクセス設定が「全員」になっているか確認
- `appsscript.json` の `access` が `ANYONE_ANONYMOUS` になっているか確認

### 認証エラー

- スクリプトプロパティに `SPREADSHEET_ID` が設定されているか確認
- スプレッドシートへのアクセス権限があるか確認
