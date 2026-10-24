# VITAL

Native iPhone health dashboard in SwiftUI, HealthKit and Swift Charts. All app copy and number/date formatting use Norwegian Bokmål. iOS 17+, Xcode 16+ recommended. No external dependencies, backend or account.

## Run on a Mac

1. Open `VITAL.xcodeproj` and select the shared **VITAL** scheme.
2. Select an iPhone simulator and Run. Choose **Utforsk med demodata** to explore 400 days of deterministic fixtures; every main screen identifies these as **Demodata**.
3. For actual measurements, select an iPhone, choose your development team in Signing & Capabilities, and use a unique bundle identifier if necessary. Keep the HealthKit capability enabled. Run, tap **Koble til Apple Helse**, and select the desired read permissions. A signing team is intentionally not committed.
4. To change access later, use Apple Health's profile → Apps → VITAL. HealthKit deliberately does not reveal whether read access was denied; empty data is never reported as proof of successful authorization.

No installation script or package resolution is necessary. Live readings require a compatible measurement source. iPhone supplies steps; pulse normally comes from a watch or compatible sensor. VITAL never writes health data or substitutes demo values into real mode.

## Test on a Mac

Select **Product → Test**, or find an available simulator with `xcrun simctl list devices available` and run:

```sh
cd /path/to/ioshelse
xcodebuild -project VITAL.xcodeproj -scheme VITAL \
  -destination 'platform=iOS Simulator,id=YOUR_SIMULATOR_UUID' \
  -derivedDataPath /tmp/VITAL-DerivedData CODE_SIGNING_ALLOWED=NO test
```

The seven XCTest cases cover overlapping sleep intervals, missing pulse gaps, half-open date boundaries, seven-day moving averages, fixture totals, zero comparison baselines and daylight-saving calendar boundaries.

Manual acceptance: explore all tabs, scrub charts, change time ranges and goals, toggle demo mode, deny health access, try an empty Health store, enable larger text/VoiceOver/Reduce Motion, and check dark mode. On device, compare cumulative totals with Apple Health, grant only some permissions, verify timestamps and sources, and background/foreground the app to refresh. Check reminders after allowing and denying notification permission.

## Structure

- `AppModel.swift`: MVVM state, local preference persistence, mode switching and foreground refresh.
- `HealthStore.swift`: read-only HealthKit statistics, sample queries, foreground observers and sleep-source selection.
- `Models.swift`: measurements, interval math, sleep union, aggregation and deterministic demo fixtures.
- `Components.swift`: reusable cards, progress rings, interactive Charts and activity heatmap.
- `Screens.swift`: onboarding, four tabs, steps and pulse analytics, settings and local reminders.

Health snapshots stay in memory. Only preferences are saved to UserDefaults; a persistent health-data cache is unnecessary, so SwiftData is not used. Notifications contain no health measurements and run locally at 19:00 when enabled. No networking or analytics SDK is included.

## Data conventions

Cumulative metrics use HealthKit statistics queries, avoiding naive summation of overlapping raw device samples. Missing days are excluded from averages and explicitly disclosed. Weekly percentage insights require two complete seven-day histories and exclude today. Other period comparisons disclose incomplete final days. Year/6-month charts use calendar-month sums; daily charts show today's hourly values. Chart scrubbing shows measured values, not interpolated readings. Pulse lines split when samples are more than 15 minutes apart. Sleep duration unions asleep intervals from a selected source; phases only appear when provided by that source. Goal achievement history is recalculated with the current goal.

## Validation status and limitations

Created in a Linux cloud workspace without Swift, Xcode, the iOS SDK or simulator. Swift source was parsed with the tree-sitter Swift grammar; the Xcode project, shared scheme, property list and entitlements passed structural parsing. This is **not** an Apple SDK compilation or an executed XCTest run. Build, UI/accessibility checks, signing and actual HealthKit behavior still require the Mac/device steps above.

The app uses foreground HealthKit observers and refresh-on-activation, not background delivery. Sleep source selection prefers the source with the most available samples; it is not a user-configurable source picker. Historical pulse samples/workouts load the most recent 60 days, while daily cumulative metrics/resting pulse load 740 days. No medical interpretations are generated. An App Store release additionally needs app icons, distribution signing and release/device validation.
