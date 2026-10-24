import * as SQLite from "expo-sqlite";
import * as DocumentPicker from "expo-document-picker";
import { File, FileMode, Paths } from "expo-file-system";
import {
  createExportReader,
  ExportPreview,
  ImportedSteps,
  MAX_ARCHIVE_BYTES,
} from "./apple-export";

let database: Promise<SQLite.SQLiteDatabase> | undefined;
async function db() {
  if (!database)
    database = (async () => {
      const value = await SQLite.openDatabaseAsync("vital-import.db");
      await value.execAsync(
        "CREATE TABLE IF NOT EXISTS imported_steps (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL)",
      );
      return value;
    })();
  return database;
}
export async function readSavedImport(): Promise<ImportedSteps | undefined> {
  const row = await (
    await db()
  ).getFirstAsync<{ payload: string }>(
    "SELECT payload FROM imported_steps WHERE id = 1",
  );
  if (!row) return;
  const value = JSON.parse(row.payload) as ImportedSteps;
  if (!value.snapshot?.steps?.length || !value.info?.importedAt)
    throw new Error(
      "Den lagrede importen kunne ikke leses. Importer eksporten på nytt.",
    );
  return value;
}
export async function saveImport(value: ImportedSteps) {
  await (
    await db()
  ).runAsync(
    "INSERT INTO imported_steps(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
    JSON.stringify(value),
  );
}
export async function eraseImport() {
  await (
    await db()
  ).execAsync("PRAGMA secure_delete=ON; DELETE FROM imported_steps; VACUUM;");
}
export async function pickAppleExport(
  onProgress: (value: number) => void,
  signal: AbortSignal,
): Promise<{ preview: ExportPreview; name: string } | undefined> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (picked.canceled) return;
  const asset = picked.assets[0]!;
  const file = new File(asset.uri);
  let handle: ReturnType<File["open"]> | undefined;
  try {
    const extension = asset.name.toLowerCase().split(".").at(-1);
    if (extension !== "xml" && extension !== "zip")
      throw new Error("Velg export.zip eller export.xml fra Apple Helse.");
    if ((asset.size ?? file.size) > MAX_ARCHIVE_BYTES)
      throw new Error("Filen er større enn 512 MB. Velg en mindre eksport.");
    const reader = createExportReader(extension),
      size = asset.size ?? file.size;
    let consumed = 0;
    handle = file.open(FileMode.ReadOnly);
    while (true) {
      if (signal.aborted) throw new Error("Importen ble avbrutt.");
      const bytes = await handle.readBytes(64 * 1024);
      if (!bytes.length) {
        reader.push(new Uint8Array(), true);
        break;
      }
      consumed += bytes.length;
      if (consumed > MAX_ARCHIVE_BYTES)
        throw new Error("Filen er større enn 512 MB.");
      reader.push(bytes);
      onProgress(size > 0 ? Math.min(0.99, consumed / size) : 0);
      // Yield between chunks so progress/cancellation and navigation remain responsive.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const preview = reader.finish();
    onProgress(1);
    return { preview, name: asset.name };
  } finally {
    handle?.close();
    // Delete only the picker's temporary copy, never the user's file in Files/iCloud.
    if (asset.uri.startsWith(Paths.cache.uri) && file.exists) file.delete();
  }
}
