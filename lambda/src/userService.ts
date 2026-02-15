import { getSheetData } from './sheets';

const SHEET_NAME = 'users';

const COL = {
  EMAIL: 0,
  ROLE: 1,
  CREATED_AT: 2,
};

export type Role = 'admin' | 'user';

/**
 * Usersシートからユーザーのロールを取得
 * 未登録の場合は 'user' を返す
 */
export async function getUserRole(email: string): Promise<Role> {
  const data = await getSheetData(SHEET_NAME);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL.EMAIL]) === email) {
      const role = String(data[i][COL.ROLE]);
      if (role === 'admin') return 'admin';
      return 'user';
    }
  }
  return 'user';
}
