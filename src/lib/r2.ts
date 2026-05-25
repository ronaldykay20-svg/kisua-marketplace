export const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

const ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID;
const ACCESS_KEY = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const SECRET_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const BUCKET = import.meta.env.VITE_R2_BUCKET_NAME;
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

async function hmac(key: ArrayBuffer, data: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256(data: ArrayBuffer | string) {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return crypto.subtle.digest('SHA-256', buf);
}

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadToR2(file: File, folder: string = 'produtos'): Promise<string> {
  const key = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const url = `${ENDPOINT}/${BUCKET}/${key}`;

  const now = new Date();
  const datestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzdate = now.toISOString().replace(/[:-]/g, '').slice(0, 15) + 'Z';
  const region = 'auto';
  const service = 's3';

  const bodyHash = toHex(await sha256(await file.arrayBuffer()));

  const canonicalHeaders =
    `content-type:${file.type}\n` +
    `host:${ACCOUNT_ID}.r2.cloudflarestorage.com\n` +
    `x-amz-content-sha256:${bodyHash}\n` +
    `x-amz-date:${amzdate}\n`;

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    `/${BUCKET}/${key}`,
    '',
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join('\n');

  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzdate,
    credentialScope,
    toHex(await sha256(canonicalRequest)),
  ].join('\n');

  const encoder = new TextEncoder();
  const kDate    = await hmac(encoder.encode('AWS4' + SECRET_KEY), datestamp);
  const kRegion  = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = toHex(await hmac(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'x-amz-date': amzdate,
      'x-amz-content-sha256': bodyHash,
      'Authorization': authorization,
    },
    body: file,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Upload falhou: ${err}`);
  }

  return `${R2_PUBLIC_URL}/${key}`;
}
