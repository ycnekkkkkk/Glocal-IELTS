/**
 * Test History Storage Manager
 * Stores test results in localStorage
 */

export interface SavedTest {
  testId: string;
  level: string;
  timestamp: number;
  skillResults: Record<string, any>;
  finalResult: any | null;
  overallBand: number;
  completedSkills: string[];
}

const STORAGE_KEY = "ielts_test_history";

/**
 * Get all saved tests
 */
export function getSavedTests(): SavedTest[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading saved tests:", error);
    return [];
  }
}

/**
 * Save a test to history
 */
export function saveTest(test: Omit<SavedTest, "timestamp">): boolean {
  try {
    const tests = getSavedTests();
    
    // Check if test already exists (by testId)
    const existingIndex = tests.findIndex((t) => t.testId === test.testId);
    
    const newTest: SavedTest = {
      ...test,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
      // Update existing test
      tests[existingIndex] = newTest;
    } else {
      // Add new test
      tests.unshift(newTest); // Add to beginning
    }

    // Keep only last 20 tests
    const trimmedTests = tests.slice(0, 20);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedTests));
    return true;
  } catch (error) {
    console.error("Error saving test:", error);
    return false;
  }
}

/**
 * Get a specific test by ID
 */
export function getTestById(testId: string): SavedTest | null {
  const tests = getSavedTests();
  return tests.find((t) => t.testId === testId) || null;
}

/**
 * Delete a test by ID
 */
export function deleteTest(testId: string): boolean {
  try {
    const tests = getSavedTests();
    const filtered = tests.filter((t) => t.testId !== testId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Error deleting test:", error);
    return false;
  }
}

/**
 * Clear all saved tests
 */
export function clearAllTests(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error("Error clearing tests:", error);
    return false;
  }
}

/**
 * Export test as JSON
 */
export function exportTestAsJSON(testId: string): string | null {
  const test = getTestById(testId);
  if (!test) return null;
  return JSON.stringify(test, null, 2);
}

/**
 * Format timestamp to readable date
 */
export function formatTestDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

