import { google, sheets_v4 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

let sheetsClient: sheets_v4.Sheets | null = null;
const ssmClient = new SSMClient({});

async function getServiceAccountKey(): Promise<string> {
  const paramName = process.env.SERVICE_ACCOUNT_KEY_PARAM || '/library/google-service-account-key';
  const res = await ssmClient.send(
    new GetParameterCommand({ Name: paramName, WithDecryption: true })
  );
  if (!res.Parameter?.Value) {
    throw new Error(`Parameter Store "${paramName}" から値を取得できません`);
  }
  return res.Parameter.Value;
}

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient;

  const keyJson = await getServiceAccountKey();
  const credentials = JSON.parse(keyJson);
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function getSpreadsheetId(): string {
  const id = process.env.SPREADSHEET_ID;
  if (!id) {
    throw new Error('SPREADSHEET_ID が設定されていません');
  }
  return id;
}

/**
 * シートの全データを取得（ヘッダー含む）
 */
export async function getSheetData(sheetName: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: sheetName,
  });
  return (res.data.values as string[][]) || [];
}

/**
 * シートに行を追加
 */
export async function appendRow(sheetName: string, values: unknown[]): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: sheetName,
    valueInputOption: 'RAW',
    requestBody: {
      values: [values.map((v) => (v === null || v === undefined ? '' : String(v)))],
    },
  });
}

/**
 * シートに複数行を追加
 */
export async function appendRows(sheetName: string, rows: unknown[][]): Promise<void> {
  if (rows.length === 0) return;
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: sheetName,
    valueInputOption: 'RAW',
    requestBody: {
      values: rows.map((row) =>
        row.map((v) => (v === null || v === undefined ? '' : String(v)))
      ),
    },
  });
}

/**
 * シートの特定行を更新（rowIndex: 1始まり、ヘッダーが1）
 */
export async function updateRow(
  sheetName: string,
  rowIndex: number,
  values: unknown[]
): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [values.map((v) => (v === null || v === undefined ? '' : String(v)))],
    },
  });
}

/** カラムインデックス（0始まり）をスプレッドシートのカラム文字に変換（例: 0→A, 25→Z, 26→AA） */
function colIndexToLetter(index: number): string {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

/**
 * シートの特定セルを更新
 */
export async function updateCell(
  sheetName: string,
  rowIndex: number,
  colIndex: number,
  value: unknown
): Promise<void> {
  const sheets = await getSheetsClient();
  const colLetter = colIndexToLetter(colIndex);
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!${colLetter}${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[value === null || value === undefined ? '' : String(value)]],
    },
  });
}

/**
 * シートの特定行を削除
 */
export async function deleteRow(sheetName: string, rowIndex: number): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  // シートIDを取得
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === sheetName);
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw new Error(`シート "${sheetName}" が見つかりません`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1, // 0始まり
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}
