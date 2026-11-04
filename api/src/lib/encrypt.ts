import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 16;
const TAG_LEN = 16;

function getSecret(): Buffer {
  const _hex = process.env['API_KEY_ENCRYPTION_SECRET'];
  if (!_hex || _hex.length !== 64) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be a 32-byte hex string (64 chars)');
  }
  return Buffer.from(_hex, 'hex');
}

export function encrypt(plaintext: string): string {
  const _iv = randomBytes(IV_LEN);
  const _cipher = createCipheriv(ALGORITHM, getSecret(), _iv);
  const _encrypted = Buffer.concat([_cipher.update(plaintext, 'utf8'), _cipher.final()]);
  const _tag = _cipher.getAuthTag();
  return `${_iv.toString('hex')}:${_tag.toString('hex')}:${_encrypted.toString('hex')}`;
}

export function decrypt(stored: string): string {
  const _parts = stored.split(':');
  if (_parts.length !== 3) throw new Error('Invalid encrypted format');
  const [_ivHex, _tagHex, _dataHex] = _parts;
  const _decipher = createDecipheriv(ALGORITHM, getSecret(), Buffer.from(_ivHex, 'hex'));
  _decipher.setAuthTag(Buffer.from(_tagHex, 'hex'));
  return _decipher.update(Buffer.from(_dataHex, 'hex'), undefined, 'utf8') + _decipher.final('utf8');
}
