/**
 * Strips characters that are structurally significant in PostgREST's `.or()`
 * filter mini-language (commas separate conditions, parentheses group them)
 * before a user-typed search term gets interpolated into a filter string.
 * This can't bypass RLS — that's enforced by Postgres regardless of the
 * filter — but an unescaped comma/paren breaks the query syntax entirely,
 * so search would fail on a term as ordinary as "Smith, Inc".
 */
export function sanitizeSearchTerm(value: string): string {
  return value.replace(/[,()]/g, ' ').trim();
}
