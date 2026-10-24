import { test } from "node:test";
import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";
import {
  buildImportedSteps,
  createExportReader,
} from "../src/data/apple-export";
import { sum } from "../src/data/models";
const record = (
  source: string,
  value: number,
  start = "2026-10-24 08:00:00 +0200",
  end = "2026-10-24 08:10:00 +0200",
  extra = "",
) =>
  `<Record type="HKQuantityTypeIdentifierStepCount" unit="count" sourceName="${source}" value="${value}" startDate="${start}" endDate="${end}" ${extra}/>`;
function xml(records: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE HealthData [<!ELEMENT HealthData (Record*)><!ELEMENT Record EMPTY>]><HealthData locale="nb_NO">${records}</HealthData>`;
}
function read(bytes: Uint8Array, format: "xml" | "zip", chunk = 31) {
  const reader = createExportReader(format);
  for (let i = 0; i < bytes.length; i += chunk)
    reader.push(bytes.subarray(i, i + chunk));
  reader.push(new Uint8Array(), true);
  return reader.finish();
}
test("XML streaming survives split Norwegian UTF-8 and entity attributes", () => {
  const preview = read(
    strToU8(xml(record("Toms iPhone &amp; ÆØÅ", 123))),
    "xml",
    1,
  );
  assert.equal(preview.sources[0]!.name, "Toms iPhone & ÆØÅ");
  const value = buildImportedSteps(
    preview,
    preview.sources[0]!.id,
    "export.xml",
  );
  assert.equal(sum(value.snapshot.steps), 123);
});
test("Apple ZIP selects only export.xml and skips routes and clinical files", () => {
  const archive = zipSync({
    "apple_health_export/workout-routes/route.gpx": strToU8("<route/>"),
    "apple_health_export/export.xml": strToU8(xml(record("iPhone", 150))),
    "apple_health_export/export_cda.xml": strToU8("<ClinicalDocument/>"),
  });
  const preview = read(archive, "zip", 17);
  assert.equal(preview.sources[0]!.records.length, 1);
});
test("iPhone and Watch stay separate and repeated import cannot accumulate totals", () => {
  const preview = read(
    strToU8(xml(record("iPhone", 100) + record("Apple Watch", 130))),
    "xml",
  );
  assert.equal(preview.sources.length, 2);
  const source = preview.sources.find((s) => s.name === "iPhone")!;
  assert.equal(
    sum(buildImportedSteps(preview, source.id, "export.xml").snapshot.steps),
    100,
  );
  assert.equal(
    sum(buildImportedSteps(preview, source.id, "export.xml").snapshot.steps),
    100,
  );
});
test("exact duplicates and overlapping samples within one source are not summed", () => {
  const a = record("iPhone", 100),
    b = record(
      "iPhone",
      90,
      "2026-10-24 08:05:00 +0200",
      "2026-10-24 08:15:00 +0200",
    );
  const preview = read(strToU8(xml(a + a + b)), "xml"),
    result = buildImportedSteps(preview, preview.sources[0]!.id, "export.xml");
  assert.equal(sum(result.snapshot.steps), 100);
  assert.equal(result.info.duplicates, 1);
  assert.equal(result.info.overlaps, 1);
});
test("adjacent intervals remain distinct; historical hours and daily sums agree", () => {
  const preview = read(
    strToU8(
      xml(
        record("Phone", 100) +
          record(
            "Phone",
            20,
            "2026-10-24 08:10:00 +0200",
            "2026-10-24 09:00:00 +0200",
          ) +
          record(
            "Phone",
            50,
            "2026-10-23 08:00:00 +0200",
            "2026-10-23 08:10:00 +0200",
          ),
      ),
    ),
    "xml",
  );
  const result = buildImportedSteps(
    preview,
    preview.sources[0]!.id,
    "export.xml",
  );
  assert.equal(result.info.days, 2);
  assert.equal(sum(result.snapshot.steps), 170);
  assert.equal(sum(result.snapshot.hourly), 170);
  for (const key of [
    "distance",
    "energy",
    "exercise",
    "pulse",
    "resting",
    "hrv",
    "sleep",
    "workouts",
  ] as const)
    assert.deepEqual(result.snapshot[key], []);
});
test("device pointer and software changes do not split a single physical source", () => {
  const a = record(
    "iPhone",
    10,
    undefined,
    undefined,
    'device="&lt;HKDevice: 0x123, name:iPhone, hardware:iPhone12,1, software:18.0&gt;"',
  );
  const b = record(
    "iPhone",
    20,
    "2026-10-23 08:00:00 +0200",
    "2026-10-23 08:10:00 +0200",
    'device="&lt;HKDevice: 0x456, name:iPhone, hardware:iPhone12,1, software:18.1&gt;"',
  );
  assert.equal(read(strToU8(xml(a + b)), "xml").sources.length, 1);
});
test("invalid counts, units, dates and reversed intervals are excluded with disclosure", () => {
  const rows =
    record("Phone", 1) +
    record("Phone", -4) +
    record("Phone", 2, "bad") +
    record(
      "Phone",
      3,
      "2026-10-24 09:00:00 +0200",
      "2026-10-24 08:00:00 +0200",
    );
  const preview = read(strToU8(xml(rows)), "xml");
  assert.equal(preview.invalid, 3);
  assert.equal(preview.sources[0]!.records.length, 1);
});
test("malformed XML, wrong root, unsupported metrics and missing ZIP export fail", () => {
  assert.throws(() => read(strToU8("<HealthData><Record>"), "xml"));
  assert.throws(
    () => read(strToU8("<ClinicalDocument/>"), "xml"),
    /HealthData/,
  );
  assert.throws(
    () =>
      read(
        strToU8(
          xml('<Record type="HKQuantityTypeIdentifierHeartRate" value="90"/>'),
        ),
        "xml",
      ),
    /ingen gyldige/,
  );
  assert.throws(
    () => read(zipSync({ "route.gpx": strToU8("<route/>") }), "zip"),
    /Fant ikke/,
  );
});
test("external XML entities cannot read files or trigger network requests", () => {
  const payload =
    '<!DOCTYPE HealthData [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><HealthData>' +
    record("&xxe;", 3) +
    "</HealthData>";
  assert.throws(() => read(strToU8(payload), "xml"), /XML/);
});
test("invalid calendar dates are rejected and fractional sample times are preserved", () => {
  const rows =
    record(
      "Phone",
      10,
      "2026-02-30 08:00:00 +0200",
      "2026-03-02 09:00:00 +0200",
    ) +
    record(
      "Phone",
      3,
      "2026-10-24 08:00:00.123 +0200",
      "2026-10-24 08:01:00.456 +0200",
    );
  const preview = read(strToU8(xml(rows)), "xml");
  assert.equal(preview.invalid, 1);
  assert.equal(
    new Date(preview.sources[0]!.records[0]!.start).getMilliseconds(),
    123,
  );
});
