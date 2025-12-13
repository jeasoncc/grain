/**
 * Fuzzy string matching utility
 * Implements a fuzzy search algorithm that supports case-insensitive matching
 * and returns a match score for sorting results.
 */

export interface FuzzyMatchResult {
  /** Whether the pattern matches the text */
  matched: boolean;
  /** Match score (higher is better). 0 if no match */
  score: number;
  /** Indices of matched characters in the text */
  matchedIndices: number[];
}

/**
 * Performs fuzzy string matching between a pattern and text.
 * 
 * The algorithm:
 * 1. Matches characters in order (not necessarily consecutive)
 * 2. Rewards consecutive matches
 * 3. Rewards matches at word boundaries (start of word, after separator)
 * 4. Penalizes gaps between matches
 * 
 * @param text - The text to search in
 * @param pattern - The pattern to search for
 * @returns FuzzyMatchResult with match status, score, and matched indices
 */
export function fuzzyMatch(text: string, pattern: string): FuzzyMatchResult {
  // Empty pattern matches everything with score 0
  if (!pattern) {
    return { matched: true, score: 0, matchedIndices: [] };
  }

  // Empty text can't match non-empty pattern
  if (!text) {
    return { matched: false, score: 0, matchedIndices: [] };
  }

  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();

  const matchedIndices: number[] = [];
  let patternIdx = 0;
  let score = 0;
  let consecutiveBonus = 0;
  let prevMatchIdx = -1;

  // Word boundary characters
  const wordBoundaryChars = new Set([' ', '-', '_', '.', '/', '\\', ':']);

  for (let textIdx = 0; textIdx < textLower.length && patternIdx < patternLower.length; textIdx++) {
    if (textLower[textIdx] === patternLower[patternIdx]) {
      matchedIndices.push(textIdx);

      // Base score for match
      let matchScore = 1;

      // Bonus for consecutive matches
      if (prevMatchIdx === textIdx - 1) {
        consecutiveBonus += 2;
        matchScore += consecutiveBonus;
      } else {
        consecutiveBonus = 0;
      }

      // Bonus for word boundary match (start of text or after separator)
      if (textIdx === 0 || wordBoundaryChars.has(text[textIdx - 1])) {
        matchScore += 5;
      }

      // Bonus for exact case match
      if (text[textIdx] === pattern[patternIdx]) {
        matchScore += 1;
      }

      // Penalty for gaps (distance from previous match)
      if (prevMatchIdx >= 0 && textIdx - prevMatchIdx > 1) {
        const gap = textIdx - prevMatchIdx - 1;
        matchScore -= Math.min(gap, 3); // Cap penalty at 3
      }

      score += matchScore;
      prevMatchIdx = textIdx;
      patternIdx++;
    }
  }

  // Check if all pattern characters were matched
  const matched = patternIdx === patternLower.length;

  if (!matched) {
    return { matched: false, score: 0, matchedIndices: [] };
  }

  // Bonus for shorter text (more relevant match)
  const lengthBonus = Math.max(0, 10 - (text.length - pattern.length) / 2);
  score += lengthBonus;

  // Bonus for match starting at beginning
  if (matchedIndices.length > 0 && matchedIndices[0] === 0) {
    score += 10;
  }

  return { matched, score, matchedIndices };
}

/**
 * Filters and sorts an array of items by fuzzy matching against a key.
 * 
 * @param items - Array of items to filter
 * @param pattern - The search pattern
 * @param getKey - Function to extract the searchable string from each item
 * @returns Filtered and sorted array of items with their match results
 */
export function fuzzyFilter<T>(
  items: T[],
  pattern: string,
  getKey: (item: T) => string
): Array<{ item: T; result: FuzzyMatchResult }> {
  if (!pattern) {
    return items.map(item => ({
      item,
      result: { matched: true, score: 0, matchedIndices: [] }
    }));
  }

  return items
    .map(item => ({
      item,
      result: fuzzyMatch(getKey(item), pattern)
    }))
    .filter(({ result }) => result.matched)
    .sort((a, b) => b.result.score - a.result.score);
}
