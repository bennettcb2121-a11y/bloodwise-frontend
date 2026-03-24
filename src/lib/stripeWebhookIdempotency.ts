/** PostgreSQL / PostgREST duplicate key */
export function isDuplicateKeyError(err: unknown): boolean {
  const e = err as { code?: string; message?: string }
  return e.code === "23505" || Boolean(e.message?.toLowerCase().includes("duplicate"))
}
