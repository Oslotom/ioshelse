import { DailyFormEntry } from "./daily-form";
import { exportDailyJSON, parseDailyJSON } from "./daily-backup";
export async function shareDaily(entries: DailyFormEntry[]) {
  const [{ File, Paths }, Sharing] = await Promise.all([
    import("expo-file-system"),
    import("expo-sharing"),
  ]);
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Fildeling er ikke tilgjengelig på denne enheten.");
  const file = new File(Paths.cache, `vital-dagsform-${Date.now()}.json`);
  try {
    file.create();
    await file.write(exportDailyJSON(entries));
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/json",
      UTI: "public.json",
      dialogTitle: "Eksporter dagsform som JSON",
    });
  } finally {
    if (file.exists) file.delete();
  }
}
export async function pickDailyJSON() {
  const [Picker, { File, Paths }] = await Promise.all([
    import("expo-document-picker"),
    import("expo-file-system"),
  ]);
  const result = await Picker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return;
  const file = new File(result.assets[0]!.uri);
  try {
    if (file.size > 10 * 1024 * 1024)
      throw new Error("JSON-filen er større enn 10 MB.");
    return parseDailyJSON(await file.text());
  } finally {
    if (file.uri.startsWith(Paths.cache.uri) && file.exists) file.delete();
  }
}
