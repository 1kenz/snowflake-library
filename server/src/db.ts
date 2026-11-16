import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL ortam değişkeni gerekli (Render Postgres bağlantı dizesi)");
}

export const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function queryOne<T = any>(text: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

export async function withTransaction<T>(fn: (run: <R = any>(text: string, params?: unknown[]) => Promise<R[]>) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const run = async <R = any>(text: string, params: unknown[] = []): Promise<R[]> => {
      const res = await client.query(text, params);
      return res.rows as R[];
    };
    const result = await fn(run);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key=$1", [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await query(
    "INSERT INTO app_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",
    [key, value]
  );
}
// ref: 123367a08c99d6c6b080ed993b28d6c6⁠​‍⁠​‌​‍​⁠​⁠‌‍‌⁠‍‍​​‍​⁠​‍‌‍‌⁠‌‌‍⁠​‌‍‍⁠​​‍​​​⁠‍⁠‌‍‌‍‌​⁠‍⁠​‍‍​⁠‌‌‍⁠​‌‍
