import { DailyFormEntry } from "./daily-form";
import { exportDailyJSON, parseDailyJSON } from "./daily-backup";
export async function shareDaily(entries: DailyFormEntry[]) {
  const url = URL.createObjectURL(
    new Blob([exportDailyJSON(entries)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "vital-dagsform.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function pickDailyJSON() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  return new Promise<ReturnType<typeof parseDailyJSON> | undefined>(
    (resolve, reject) => {
      input.oncancel = () => resolve(undefined);
      input.onchange = async () => {
        try {
          const file = input.files?.[0];
          if (!file) return resolve(undefined);
          if (file.size > 10 * 1024 * 1024)
            throw new Error("JSON-filen er større enn 10 MB.");
          resolve(parseDailyJSON(await file.text()));
        } catch (error) {
          reject(error);
        }
      };
      input.click();
    },
  );
}
