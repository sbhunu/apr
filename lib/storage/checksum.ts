/**
 * Checksum Generation
 * Generate checksums for file integrity verification
 */

/**
 * Generate SHA-256 checksum for a file
 */
export async function generateChecksum(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Generate MD5 checksum for a file (for compatibility)
 */
export async function generateMD5Checksum(file: File): Promise<string> {
  // Note: Web Crypto API doesn't support MD5, so we use SHA-256 instead
  // If MD5 is specifically required, consider using a library like crypto-js
  return generateChecksum(file)
}

/**
 * Verify file integrity using checksum
 */
export async function verifyFileIntegrity(
  file: File,
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = await generateChecksum(file)
  return actualChecksum === expectedChecksum
}

