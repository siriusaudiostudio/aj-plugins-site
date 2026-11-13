const encoder = new TextEncoder();

export async function isAdmin(request, token) {
  const supplied = request.headers.get('Authorization') ?? '';
  if (typeof token !== 'string' || token.length < 32 ||
      !supplied.startsWith('Bearer ') || supplied.length > 256) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(token), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const proof = await crypto.subtle.sign('HMAC', key, encoder.encode(token));
  return crypto.subtle.verify('HMAC', key, proof, encoder.encode(supplied.slice(7)));
}
