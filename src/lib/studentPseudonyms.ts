/**
 * FERPA-compliant student pseudonym system
 * Generates consistent animal-based pseudonyms for students
 * to protect student identity while maintaining usability.
 */

const ANIMALS = [
  'Brave Bear', 'Swift Falcon', 'Wise Owl', 'Gentle Deer', 'Clever Fox',
  'Bold Eagle', 'Quiet Mouse', 'Strong Tiger', 'Happy Dolphin', 'Quick Rabbit',
  'Curious Cat', 'Loyal Dog', 'Bright Parrot', 'Calm Turtle', 'Agile Monkey',
  'Mighty Lion', 'Graceful Swan', 'Playful Otter', 'Patient Panda', 'Fearless Hawk',
  'Keen Koala', 'Noble Horse', 'Spirited Wolf', 'Cheerful Penguin', 'Steady Elephant',
  'Nimble Squirrel', 'Proud Peacock', 'Silent Panther', 'Friendly Seal', 'Daring Jaguar',
  'Clever Crow', 'Gentle Giraffe', 'Swift Cheetah', 'Wise Whale', 'Brave Buffalo',
  'Happy Hedgehog', 'Calm Crane', 'Bold Bobcat', 'Kind Kangaroo', 'Lively Lemur',
  'Merry Meerkat', 'Noble Narwhal', 'Perky Puffin', 'Quick Quail', 'Radiant Raven',
  'Serene Stork', 'Trusty Toucan', 'Unique Unicorn', 'Vibrant Vulture', 'Witty Weasel',
];

// Cache for consistent pseudonyms during a session
const pseudonymCache = new Map<string, string>();
const usedPseudonyms = new Set<string>();

/**
 * Generates a deterministic pseudonym based on student ID.
 * Uses a simple hash to ensure consistency across the app.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Cache for custom pseudonyms from database
const customPseudonymCache = new Map<string, string>();

/**
 * Sets a custom pseudonym for a student (from database).
 */
export function setCustomPseudonym(studentId: string, customPseudonym: string | null): void {
  if (customPseudonym) {
    customPseudonymCache.set(studentId, customPseudonym);
  } else {
    customPseudonymCache.delete(studentId);
  }
  // Clear the generated pseudonym cache so it regenerates
  pseudonymCache.delete(studentId);
}

/**
 * Gets or generates a pseudonym for a student ID.
 * Pseudonyms are consistent within a session and unique per student.
 */
export function getStudentPseudonym(studentId: string): string {
  // Check for custom pseudonym first
  if (customPseudonymCache.has(studentId)) {
    return customPseudonymCache.get(studentId)!;
  }

  // Check cache
  if (pseudonymCache.has(studentId)) {
    return pseudonymCache.get(studentId)!;
  }

  // Generate deterministic index based on student ID
  const baseIndex = hashCode(studentId) % ANIMALS.length;
  
  // Find an unused pseudonym starting from the base index
  let pseudonym = ANIMALS[baseIndex];
  let suffix = 1;
  let attemptedPseudonym = pseudonym;
  
  while (usedPseudonyms.has(attemptedPseudonym)) {
    suffix++;
    attemptedPseudonym = `${pseudonym} ${suffix}`;
  }
  
  // Cache and mark as used
  pseudonymCache.set(studentId, attemptedPseudonym);
  usedPseudonyms.add(attemptedPseudonym);
  
  return attemptedPseudonym;
}

/**
 * Get all available pseudonym options for selection.
 */
export function getAvailablePseudonyms(): string[] {
  return [...ANIMALS];
}

/**
 * Gets the initials from a pseudonym for avatar display.
 */
export function getPseudonymInitials(pseudonym: string): string {
  const parts = pseudonym.split(' ');
  if (parts.length >= 2) {
    // Take first letter of adjective and first letter of animal
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return pseudonym.substring(0, 2).toUpperCase();
}

/**
 * Resets the pseudonym cache. Call this when switching contexts
 * or when you need fresh pseudonyms (e.g., on logout).
 */
export function resetPseudonymCache(): void {
  pseudonymCache.clear();
  usedPseudonyms.clear();
}

/**
 * Batch generates pseudonyms for multiple students.
 * More efficient than calling getStudentPseudonym repeatedly.
 */
export function getStudentPseudonyms(studentIds: string[]): Map<string, string> {
  const results = new Map<string, string>();
  for (const id of studentIds) {
    results.set(id, getStudentPseudonym(id));
  }
  return results;
}
