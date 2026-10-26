import crypto from 'crypto';
import faceConfig from '../config/faceConfig.js';
import logger from './logger.js';

/**
 * Derive encryption keys using PBKDF2 HMAC SHA256.
 * @param {string} secret - Configuration secret key
 * @param {number} keyLength - Derived key length in bytes
 * @returns {Buffer} Derived cryptographic key
 */
function deriveKey(secret, keyLength = 32) {
  const keyMaterial = Buffer.from(secret, 'utf-8');
  const salt = Buffer.from('face_auth_salt_v1', 'utf-8');
  return crypto.pbkdf2Sync(keyMaterial, salt, 100000, keyLength, 'sha256');
}

/**
 * Derive keys specifically for decrypting Python Fernet tokens.
 * @param {string} secret - Configuration secret key
 * @returns {Object} { signingKey, encryptionKey }
 */
function deriveFernetKeys(secret) {
  const derivedKey = deriveKey(secret, 32);
  const signingKey = derivedKey.subarray(0, 16);
  const encryptionKey = derivedKey.subarray(16, 32);
  return { signingKey, encryptionKey };
}

/**
 * Decrypt a Fernet token (AES-128-CBC + HMAC-SHA256 signature).
 * @param {string} tokenB64 - Base64 encoded Fernet token
 * @param {string} secret - Configuration secret key
 * @returns {string} Decrypted string payload
 */
export function decryptFernet(tokenB64, secret) {
  const { signingKey, encryptionKey } = deriveFernetKeys(secret);
  const token = Buffer.from(tokenB64, 'base64');
  
  if (token[0] !== 0x80) {
    throw new Error('Invalid Fernet token version');
  }
  
  // Fernet Token Format:
  // Version (1B) || Timestamp (8B) || IV (16B) || Ciphertext (var) || HMAC (32B)
  const iv = token.subarray(9, 25);
  const ciphertext = token.subarray(25, token.length - 32);
  const signature = token.subarray(token.length - 32);
  
  // Verify HMAC signature over everything before signature
  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(token.subarray(0, token.length - 32));
  const expectedSignature = hmac.digest();
  
  if (!crypto.timingSafeEqual(signature, expectedSignature)) {
    throw new Error('Fernet signature verification failed (data was tampered)');
  }
  
  // Decrypt AES-128-CBC
  const decipher = crypto.createDecipheriv('aes-128-cbc', encryptionKey, iv);
  let decrypted = decipher.update(ciphertext, 'binary', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Encrypt embeddings list using AES-256-GCM.
 * @param {Array<number>} embedding - 128-d float array
 * @returns {string} Encrypted string token in format GCM:iv:tag:ciphertext
 */
export function encryptEmbedding(embedding) {
  try {
    const secret = faceConfig.encryptionSecret;
    const key = deriveKey(secret, 32);
    const iv = crypto.randomBytes(12); // Standard 12-byte IV for GCM
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = JSON.stringify(embedding);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    const tag = cipher.getAuthTag().toString('hex');
    
    return `GCM:${iv.toString('hex')}:${tag}:${ciphertext}`;
  } catch (error) {
    logger.error('Failed to encrypt embedding:', error);
    throw new Error(`Embedding encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a token string (handles both GCM and legacy Fernet).
 * @param {string} tokenStr - Cipher text token
 * @returns {Array<number>} Decrypted 128-d float array
 */
export function decryptEmbedding(tokenStr) {
  const secret = faceConfig.encryptionSecret;
  
  if (tokenStr.startsWith('GCM:')) {
    try {
      const parts = tokenStr.split(':');
      const iv = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      const ciphertext = Buffer.from(parts[3], 'hex');
      
      const key = deriveKey(secret, 32);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('AES-256-GCM decryption failed:', error);
      throw new Error(`GCM Decryption failed: ${error.message}`);
    }
  } else {
    // Fallback to legacy Python Fernet decryption
    try {
      const plaintext = decryptFernet(tokenStr, secret);
      return JSON.parse(plaintext);
    } catch (error) {
      logger.error('Legacy Fernet decryption failed:', error);
      throw new Error(`Fernet Decryption failed: ${error.message}`);
    }
  }
}

/**
 * Encrypt a batch of embeddings (for user registration).
 * @param {Array<Array<number>>} embeddings - List of 4 embedding vectors
 * @returns {Array<string>} List of encrypted token strings
 */
export function encryptEmbeddings(embeddings) {
  return embeddings.map(emb => encryptEmbedding(emb));
}

/**
 * Decrypt a batch of embeddings.
 * @param {Array<string>} tokens - List of encrypted tokens
 * @returns {Array<Array<number>>} List of decrypted embedding vectors
 */
export function decryptEmbeddings(tokens) {
  return tokens.map(token => decryptEmbedding(token));
}
