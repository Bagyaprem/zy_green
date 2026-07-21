let counter = 0;

/** Generates a reasonably unique, human-readable id for newly-created records before insert. */
export function generateId(prefix: string): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now().toString(36)}${rand}${counter}`.toUpperCase();
}
