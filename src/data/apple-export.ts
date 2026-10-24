import { SaxesParser } from "saxes";
import { DecodeUTF8, Unzip, UnzipInflate } from "fflate";
import { emptySnapshot, Reading, startOfDay } from "./models";

export const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;
export const MAX_XML_BYTES = 512 * 1024 * 1024;
const MAX_STEP_RECORDS = 400000;
const MAX_SOURCES = 100;
export class ExportReadError extends Error {}
type StepRecord = { start: number; end: number; value: number };
export type ExportSource = {
  id: string;
  name: string;
  device: string;
  records: StepRecord[];
};
export type ExportPreview = { sources: ExportSource[]; invalid: number };
export type ImportInfo = {
  name: string;
  source: string;
  importedAt: string;
  from: string;
  to: string;
  days: number;
  records: number;
  duplicates: number;
  overlaps: number;
  invalid: number;
};
export type ImportedSteps = {
  snapshot: ReturnType<typeof emptySnapshot>;
  info: ImportInfo;
};

function appleDate(value: string | undefined): number | undefined {
  if (!value) return;
  const match =
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?) ?([+-]\d{2}):?(\d{2})$/.exec(
      value,
    );
  if (!match) return;
  const civil = Date.parse(`${match[1]}T${match[2]}Z`);
  if (
    !Number.isFinite(civil) ||
    new Date(civil).toISOString().slice(0, 19) !==
      `${match[1]}T${match[2]!.slice(0, 8)}`
  )
    return;
  const result = Date.parse(`${match[1]}T${match[2]}${match[3]}:${match[4]}`);
  return Number.isFinite(result) ? result : undefined;
}
export function createExportParser() {
  const sources = new Map<string, ExportSource>();
  let invalid = 0,
    records = 0,
    root = false,
    closed = false;
  const parser = new SaxesParser({ xmlns: false });
  parser.on("opentag", (tag) => {
    if (!root) {
      if (tag.name !== "HealthData")
        throw new ExportReadError(
          "Filen er ikke en Apple Helse-eksport (HealthData mangler).",
        );
      root = true;
    }
    if (
      tag.name !== "Record" ||
      tag.attributes.type !== "HKQuantityTypeIdentifierStepCount"
    )
      return;
    const attributes = tag.attributes as Record<string, string>;
    const start = appleDate(attributes.startDate),
      end = appleDate(attributes.endDate),
      value = Number(attributes.value);
    if (
      attributes.unit !== "count" ||
      !attributes.value?.trim() ||
      !Number.isSafeInteger(value) ||
      value < 0 ||
      start === undefined ||
      end === undefined ||
      end < start
    ) {
      invalid++;
      return;
    }
    if (++records > MAX_STEP_RECORDS)
      throw new ExportReadError(
        "Eksporten inneholder mer enn 400 000 skrittmålinger. Importer en mindre eksport.",
      );
    const name = attributes.sourceName?.trim() || "Ukjent kilde";
    // Separate devices even when two phones share a source name. Never combine Watch and iPhone totals.
    const device = (attributes.device ?? "")
        .replace(/0x[0-9a-f]+/gi, "")
        .replace(/software:[^,>]+/g, "")
        .replace(/\s+/g, " ")
        .trim(),
      id = JSON.stringify([name, device]);
    if (!sources.has(id)) {
      if (sources.size >= MAX_SOURCES)
        throw new ExportReadError(
          "Eksporten inneholder for mange skrittkilder.",
        );
      sources.set(id, { id, name, device, records: [] });
    }
    sources.get(id)!.records.push({ start, end, value });
  });
  // saxes recognizes the Apple DOCTYPE but never retrieves external DTDs/entities.
  parser.on("error", () => {
    throw new ExportReadError(
      "XML-filen er skadet eller inneholder ugyldige XML-elementer.",
    );
  });
  return {
    write(text: string) {
      if (closed)
        throw new ExportReadError("Importleseren er allerede lukket.");
      parser.write(text);
    },
    finish(): ExportPreview {
      parser.close();
      closed = true;
      if (!root || !sources.size)
        throw new ExportReadError(
          "Fant ingen gyldige skrittmålinger i eksporten.",
        );
      return {
        sources: [...sources.values()].sort(
          (a, b) => b.records.length - a.records.length,
        ),
        invalid,
      };
    },
  };
}
class SelectedInflate extends UnzipInflate {
  private skip: boolean;
  constructor(name: string) {
    super();
    this.skip = !/^(?:apple_health_export\/)?export\.xml$/i.test(name);
  }
  push(chunk: Uint8Array, final: boolean) {
    if (this.skip) this.ondata(null, new Uint8Array(), final);
    else super.push(chunk, final);
  }
}
export function createExportReader(format: "xml" | "zip") {
  const parser = createExportParser();
  let xmlBytes = 0,
    found = 0,
    finished = false,
    failure: Error | undefined;
  const decoder = new DecodeUTF8((text) => parser.write(text));
  const write = (bytes: Uint8Array, final: boolean) => {
    xmlBytes += bytes.length;
    if (xmlBytes > MAX_XML_BYTES)
      throw new ExportReadError(
        "Den utpakkede XML-filen er større enn 512 MB. Importer en mindre eksport.",
      );
    decoder.push(bytes, final);
  };
  const unzip =
    format === "zip"
      ? new Unzip((file) => {
          if (!/^(?:apple_health_export\/)?export\.xml$/i.test(file.name)) {
            file.ondata = () => {};
            file.start();
            return;
          }
          if (++found > 1) {
            failure = new ExportReadError(
              "ZIP-filen inneholder flere export.xml-filer. Velg én XML-fil.",
            );
            return;
          }
          if (file.originalSize && file.originalSize > MAX_XML_BYTES) {
            failure = new ExportReadError(
              "Den utpakkede XML-filen er større enn 512 MB.",
            );
            return;
          }
          file.ondata = (error, data, final) => {
            if (error) {
              failure = new ExportReadError(
                "Kunne ikke pakke ut eksporten. ZIP-filen kan være skadet.",
              );
              return;
            }
            if (failure) return;
            try {
              write(data, final);
              if (final) finished = true;
            } catch (e) {
              failure =
                e instanceof Error
                  ? e
                  : new ExportReadError("Kunne ikke lese XML-filen.");
            }
          };
          file.start();
        })
      : undefined;
  unzip?.register(SelectedInflate);
  return {
    push(bytes: Uint8Array, final = false) {
      if (failure) throw failure;
      try {
        if (unzip) unzip.push(bytes, final);
        else {
          write(bytes, final);
          if (final) finished = true;
        }
      } catch (error) {
        if (error instanceof ExportReadError) throw error;
        throw new ExportReadError(
          "Kunne ikke lese ZIP/XML-eksporten. Filen kan være skadet eller bruke et format som ikke støttes.",
        );
      }
      if (failure) throw failure;
    },
    finish() {
      if (unzip && found !== 1)
        throw new ExportReadError(
          "Fant ikke apple_health_export/export.xml i ZIP-filen.",
        );
      if (!finished) throw new ExportReadError("Eksportfilen er ufullstendig.");
      return parser.finish();
    },
  };
}
export function buildImportedSteps(
  preview: ExportPreview,
  sourceId: string,
  fileName: string,
  now = new Date(),
): ImportedSteps {
  const source = preview.sources.find((s) => s.id === sourceId);
  if (!source) throw new ExportReadError("Velg en gyldig skrittkilde.");
  const daily = new Map<string, number>(),
    hours = new Map<string, number>();
  let duplicates = 0,
    overlaps = 0,
    accepted = 0,
    lastEnd = -Infinity;
  const seen = new Set<string>(),
    today = startOfDay(now);
  const records = [...source.records].sort(
    (a, b) => a.start - b.start || b.end - a.end || b.value - a.value,
  );
  let first: number | undefined, last: number | undefined;
  for (const record of records) {
    const key = `${record.start}:${record.end}:${record.value}`;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    if (record.start < lastEnd) {
      overlaps++;
      continue;
    }
    lastEnd = Math.max(lastEnd, record.end);
    accepted++;
    first = first === undefined ? record.start : Math.min(first, record.start);
    last = last === undefined ? record.end : Math.max(last, record.end);
    const date = new Date(record.start),
      day = startOfDay(date).toISOString();
    daily.set(day, (daily.get(day) ?? 0) + record.value);
    const hour = new Date(date);
    hour.setMinutes(0, 0, 0);
    const hourKey = hour.toISOString();
    hours.set(hourKey, (hours.get(hourKey) ?? 0) + record.value);
  }
  if (!accepted || first === undefined || last === undefined)
    throw new ExportReadError("Kilden har ingen gyldige skrittmålinger.");
  const readings = (rows: Map<string, number>): Reading[] =>
    [...rows]
      .map(([date, value]) => ({
        date,
        value,
        source: `Import · ${source.name}`,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  const snapshot = emptySnapshot();
  snapshot.steps = readings(daily);
  snapshot.hourly = readings(hours);
  return {
    snapshot,
    info: {
      name: fileName,
      source: source.name,
      importedAt: now.toISOString(),
      from: new Date(first).toISOString(),
      to: new Date(last).toISOString(),
      days: daily.size,
      records: accepted,
      duplicates,
      overlaps,
      invalid: preview.invalid,
    },
  };
}
