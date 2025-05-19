/**
 * Generate a random ID string
 * @returns A random string that can be used as an ID
 */
export const generateId = (): string => Math.random().toString(36).substring(2, 9);

/**
 * Calculate the distance between two points
 * @param x1 First point x coordinate
 * @param y1 First point y coordinate
 * @param x2 Second point x coordinate
 * @param y2 Second point y coordinate
 * @returns The distance between the two points
 */
export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};