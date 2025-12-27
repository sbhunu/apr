/**
 * Fuzzy matching utilities for place name searches
 * Helps handle typos, missing characters, and character swaps
 */

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to transform one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        )
      }
    }
  }

  return matrix[len1][len2]
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
export function similarityScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  return 1 - distance / maxLen
}

/**
 * Check if two strings are similar enough (fuzzy match)
 * @param str1 First string
 * @param str2 Second string
 * @param threshold Minimum similarity score (0-1), default 0.6
 */
export function isFuzzyMatch(str1: string, str2: string, threshold: number = 0.6): boolean {
  return similarityScore(str1, str2) >= threshold
}

/**
 * Find the best matching string from an array of candidates
 * @param query Search query
 * @param candidates Array of candidate strings
 * @param threshold Minimum similarity score (0-1), default 0.5
 * @returns Best match with similarity score, or null if no match above threshold
 */
export function findBestMatch(
  query: string,
  candidates: string[],
  threshold: number = 0.5
): { match: string; score: number } | null {
  let bestMatch: { match: string; score: number } | null = null
  const queryLower = query.toLowerCase()

  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase()
    
    // Check if query is contained in candidate (substring match)
    if (candidateLower.includes(queryLower)) {
      const score = queryLower.length / candidateLower.length
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { match: candidate, score }
      }
      continue
    }

    // Check if candidate is contained in query (substring match)
    if (queryLower.includes(candidateLower)) {
      const score = candidateLower.length / queryLower.length
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { match: candidate, score }
      }
      continue
    }

    // Use Levenshtein distance for fuzzy matching
    const score = similarityScore(query, candidate)
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { match: candidate, score }
    }
  }

  return bestMatch
}

/**
 * Generate search variations for a query to improve matching
 * @param query Original search query
 * @returns Array of search variations
 */
export function generateSearchVariations(query: string): string[] {
  const variations: string[] = [query]
  const lower = query.toLowerCase()

  // Add common variations
  if (lower.length > 3) {
    // Try without last character (common typo: missing last char)
    variations.push(query.slice(0, -1))
    
    // Try with common character swaps (e.g., "Muromedz" -> "Murombedz")
    // This is handled by Levenshtein distance, but we can add specific patterns
  }

  return variations
}

