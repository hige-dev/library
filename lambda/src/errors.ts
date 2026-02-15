/**
 * ビジネスロジックのエラー（クライアントにメッセージを返しても安全なエラー）
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}
