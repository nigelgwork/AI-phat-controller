import { app } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const KEY_FILE_NAME = '.encryption-key';
const KEY_LENGTH = 32; // 256 bits

let cachedKey: string | null = null;

/**
 * Get the path to the encryption key file
 */
function getKeyFilePath(): string {
  return path.join(app.getPath('userData'), KEY_FILE_NAME);
}

/**
 * Generate a new random encryption key
 */
function generateKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Get or create the encryption key for electron-store
 * The key is stored in a file in the user's data directory.
 * This provides encryption at rest while maintaining usability.
 */
export function getEncryptionKey(): string {
  // Return cached key if available
  if (cachedKey) {
    return cachedKey;
  }

  const keyFilePath = getKeyFilePath();

  try {
    // Try to read existing key
    if (fs.existsSync(keyFilePath)) {
      const keyData = fs.readFileSync(keyFilePath, 'utf-8').trim();
      if (keyData && keyData.length === KEY_LENGTH * 2) {
        cachedKey = keyData;
        return cachedKey;
      }
    }

    // Generate new key if not exists or invalid
    const newKey = generateKey();

    // Ensure directory exists
    const dir = path.dirname(keyFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write key file with restricted permissions
    fs.writeFileSync(keyFilePath, newKey, { mode: 0o600 });

    cachedKey = newKey;
    return cachedKey;
  } catch (error) {
    // If we can't read/write the key file, generate a session-only key
    // This means data won't persist across restarts if key file is inaccessible
    console.error('[EncryptionKey] Failed to manage encryption key file:', error);
    if (!cachedKey) {
      cachedKey = generateKey();
    }
    return cachedKey;
  }
}

/**
 * Check if encryption is properly initialized
 */
export function isEncryptionReady(): boolean {
  try {
    const key = getEncryptionKey();
    return key.length === KEY_LENGTH * 2;
  } catch {
    return false;
  }
}
