/** Order-insensitive comparison; null and undefined count as empty. */
export function sameItems(left: string[] | null | undefined, right: string[] | null | undefined): boolean {
  const a = [...(left ?? [])].sort();
  const b = [...(right ?? [])].sort();

  return a.length === b.length && a.every((value, index) => value === b[index]);
}
