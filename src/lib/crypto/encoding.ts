/**
 * Encodings shared by the browser and the server. Base64url (no padding) is
 * the wire format for keys and ciphertext; the recovery key is shown to
 * people as Crockford base32 in groups of four.
 */

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** Length in bytes of a base64url string without padding, or null when malformed. */
export function base64UrlByteLength(value: unknown): number | null {
  if (typeof value !== "string" || value.length === 0 || !BASE64URL.test(value)) return null;
  if (value.length % 4 === 1) return null;
  return Math.floor((value.length * 3) / 4);
}

export function isBase64Url(value: unknown, bytes?: number): value is string {
  const length = base64UrlByteLength(value);
  return length !== null && (bytes === undefined || length === bytes);
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Crockford base32, upper case, grouped in fours: "7K3Q-…". */
export function toRecoveryCode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31];
  return out.match(/.{1,4}/g)?.join("-") ?? out;
}

/**
 * Reads a recovery code typed or pasted by a person: case, spaces, and
 * dashes do not matter, and I/L and O are read as 1 and 0.
 */
export function fromRecoveryCode(code: string, bytes: number): Uint8Array | null {
  const clean = code
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
  if (clean.length !== Math.ceil((bytes * 8) / 5)) return null;
  const out = new Uint8Array(bytes);
  let bits = 0;
  let value = 0;
  let index = 0;
  for (const char of clean) {
    const digit = CROCKFORD.indexOf(char);
    if (digit === -1) return null;
    value = ((value << 5) | digit) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      if (index < bytes) out[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return index === bytes ? out : null;
}
