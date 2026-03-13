import http from 'node:http';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './index';

const PORT = parseInt(process.env.PORT || '3001', 10);

/**
 * HTTPリクエストからボディを読み取る
 */
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

/**
 * HTTPリクエストを Lambda の APIGatewayProxyEventV2 に変換
 */
function toApiGatewayEvent(
  req: http.IncomingMessage,
  body: string
): APIGatewayProxyEventV2 {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers[key.toLowerCase()] = value;
    }
  }

  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: req.url || '/',
    rawQueryString: '',
    headers,
    requestContext: {
      accountId: 'local',
      apiId: 'local',
      domainName: 'localhost',
      domainPrefix: 'localhost',
      http: {
        method: req.method || 'GET',
        path: req.url || '/',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: headers['user-agent'] || '',
      },
      requestId: 'local-' + Date.now(),
      routeKey: '$default',
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    body,
    isBase64Encoded: false,
  } as APIGatewayProxyEventV2;
}

const server = http.createServer(async (req, res) => {
  try {
    const body = await readBody(req);
    const event = toApiGatewayEvent(req, body);
    const result = await handler(event);

    const statusCode = typeof result === 'object' && result !== null && 'statusCode' in result
      ? (result as { statusCode: number }).statusCode
      : 200;
    const responseHeaders = typeof result === 'object' && result !== null && 'headers' in result
      ? (result as { headers: Record<string, string> }).headers
      : {};
    const responseBody = typeof result === 'object' && result !== null && 'body' in result
      ? (result as { body: string }).body
      : JSON.stringify(result);

    for (const [key, value] of Object.entries(responseHeaders || {})) {
      res.setHeader(key, value);
    }
    res.writeHead(statusCode);
    res.end(responseBody);
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`ローカル開発サーバーを起動しました: http://localhost:${PORT}`);
  console.log(`SKIP_AUTH: ${process.env.SKIP_AUTH === 'true' ? '有効' : '無効'}`);
});
