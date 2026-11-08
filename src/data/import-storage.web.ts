import type { ImportedSteps, ExportPreview } from "./apple-export";
export async function readSavedImport(): Promise<ImportedSteps | undefined> {
  return undefined;
}
export async function saveImport(_value: ImportedSteps): Promise<void> {
  throw new Error(
    "Apple Helse-import er tilgjengelig i mobilappen. Bruk demodata i nettleseren.",
  );
}
export async function eraseImport(): Promise<void> {}
export async function pickAppleExport(
  _onProgress: (value: number) => void,
  _signal: AbortSignal,
): Promise<{ preview: ExportPreview; name: string } | undefined> {
  throw new Error(
    "Importer Apple Helse-eksporten i mobilappen. Nettleserversjonen viser eksempeldata.",
  );
}
