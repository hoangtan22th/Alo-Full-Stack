export function findMostFrequent<T>(arr: T[]): T | null {
  const filtered = arr.filter((x) => x !== null && x !== undefined && (x as any) !== "");
  if (filtered.length === 0) return null;

  const frequencyMap: Map<T, number> = new Map();
  let maxElement = filtered[0] as T;
  let maxCount = 0;

  for (const element of filtered) {
    const count = (frequencyMap.get(element) || 0) + 1;
    frequencyMap.set(element, count);
    if (count > maxCount) {
      maxCount = count;
      maxElement = element;
    }
  }

  return maxElement;
}
