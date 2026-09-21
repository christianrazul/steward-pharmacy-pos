import Database from "@tauri-apps/plugin-sql";

const DATABASE_URL = "sqlite:steward.db";

let connection: Promise<Database> | null = null;

export function openDatabase(): Promise<Database> {
  connection ??= Database.load(DATABASE_URL);
  return connection;
}

export async function readDatabaseVersion(): Promise<string> {
  const database = await openDatabase();
  const rows = await database.select<{ version: string }[]>(
    "select sqlite_version() as version",
  );
  return rows[0]?.version ?? "unknown";
}
