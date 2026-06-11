/**
 * End-to-End Encryption using Browser-Native Web Crypto (AES-GCM 256)
 * Derived from the couple's shared Love Key.
 */

// Helper to convert an ArrayBuffer to a Hex string
function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert a Hex string to an ArrayBuffer
function hexToBuf(hexString: string): ArrayBuffer {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const hex = hexString.substr(i * 2, 2);
    bytes[i] = parseInt(hex, 16);
  }
  return bytes.buffer;
}

/**
 * Derives a CryptoKey from a human-readable password/Love Key using SHA-256
 */
async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);
  
  // Hash the password with SHA-256 to get a consistent 256-bit key material
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', passwordBuffer);
  
  // Import the hash buffer as an AES-GCM key
  return window.crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts cleartext using an AES-GCM 256-bit key derived from the loveKey password
 * Returns the hex ciphertext and hex Initialization Vector (IV)
 */
export async function encryptMessage(text: string, loveKey: string): Promise<{ ciphertext: string; iv: string }> {
  try {
    if (!text) return { ciphertext: '', iv: '' };
    const password = loveKey.trim().toUpperCase() || 'MUTU-DEFAULT-LOVE-KEY';
    
    const key = await deriveKey(password);
    const enc = new TextEncoder();
    const encodedText = enc.encode(text);
    
    // Generate a random 12-byte IV (96 bits) for AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const privateBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encodedText
    );
    
    return {
      ciphertext: bufToHex(privateBuffer),
      iv: bufToHex(iv.buffer)
    };
  } catch (err) {
    console.error('Private Encryption Failed:', err);
    // Return empty but do not crash
    return { ciphertext: '', iv: '' };
  }
}

/**
 * Decrypts a hex ciphertext using an AES-GCM key derived from the loveKey password
 */
export async function decryptMessage(ciphertext: string, ivHex: string, loveKey: string): Promise<string> {
  try {
    if (!ciphertext || !ivHex) return '';
    const password = loveKey.trim().toUpperCase() || 'MUTU-DEFAULT-LOVE-KEY';
    
    const key = await deriveKey(password);
    const cipherBuffer = hexToBuf(ciphertext);
    const ivBuffer = hexToBuf(ivHex);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer)
      },
      key,
      cipherBuffer
    );
    
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.warn('Private Decryption Failed (Key might be incorrect or modified):', err);
    return '🔒 [Private Message - Unlock with Relationship Key]';
  }
}
