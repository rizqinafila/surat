// =============================================================================
// Supabase Edge Function: Autentikasi Google Service Account (OAuth2 via RS256)
// Menggunakan Web Crypto API Deno standar tanpa dependensi eksternal
// =============================================================================

export interface GoogleServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function base64UrlEncode(data: Uint8Array | string): string {
  let base64: string;
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    let binary = '';
    const bytes = data;
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToBinary(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

/**
 * Menghasilkan Google OAuth2 Access Token untuk scope Google Sheets API
 */
export async function getGoogleAccessToken(
  serviceAccount: GoogleServiceAccountKey,
  scope: string = 'https://www.googleapis.com/auth/spreadsheets'
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope: scope,
    aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  // Import Private Key PKCS#8
  const keyBuffer = pemToBinary(serviceAccount.private_key);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign RS256
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(message)
  );

  const signature = base64UrlEncode(new Uint8Array(signatureBuffer));
  const jwt = `${message}.${signature}`;

  // Exchange JWT for Access Token
  const tokenUrl = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google OAuth2 Token Exchange gagal (${response.status}): ${errorText}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

