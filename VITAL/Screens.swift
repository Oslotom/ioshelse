import SwiftUI
import Charts
import UIKit
import UserNotifications

struct RootView: View {
    @EnvironmentObject private var model: AppModel
    @State private var tab = 0
    var body: some View {
        Group {
            if !model.onboarded { OnboardingView() }
            else {
                TabView(selection: $tab) {
                    NavigationStack { DashboardView(openSettings: { tab = 3 }) }.tabItem { Label("Oversikt", systemImage: "square.grid.2x2.fill") }.tag(0)
                    NavigationStack { ActivityView() }.tabItem { Label("Aktivitet", systemImage: "figure.walk") }.tag(1)
                    NavigationStack { TrendsView() }.tabItem { Label("Trender", systemImage: "chart.xyaxis.line") }.tag(2)
                    NavigationStack { SettingsView() }.tabItem { Label("Innstillinger", systemImage: "slider.horizontal.3") }.tag(3)
                }.tint(.mintVital)
            }
        }
    }
}
struct OnboardingView: View {
    @EnvironmentObject private var model: AppModel
    @State private var connecting = false
    var body: some View {
        Page {
            Spacer(minLength: 50)
            Image(systemName: "heart.text.clipboard.fill").font(.system(size: 64)).foregroundStyle(Color.mintVital).accessibilityHidden(true)
            Text("VITAL").font(.caption.weight(.bold)).tracking(5)
            Text("Din helse.\nEt klarere bilde.").font(.system(size: 42, weight: .bold, design: .rounded)).fixedSize(horizontal: false, vertical: true)
            Text("Små bevegelser. Gode vaner. Få en rolig oversikt over aktivitet, puls og søvn.").font(.title3).foregroundStyle(.secondary)
            Card {
                Label("Bare på din iPhone", systemImage: "lock.shield").font(.headline)
                Text("VITAL ber kun om å lese fra Apple Helse. Ingen konto, ingen server og ingen deling av helseopplysninger.").foregroundStyle(.secondary)
                Text("Du velger selv hvilke opplysninger du vil gi tilgang til. Du kan fortsette uten tilgang og endre dette senere i Helse.").font(.footnote).foregroundStyle(.secondary)
            }
            Button { connecting = true; Task { await model.connect(); connecting = false } } label: {
                HStack { Spacer(); if connecting { ProgressView() }; Text("Koble til Apple Helse").fontWeight(.semibold); Spacer() }.padding(10)
            }.buttonStyle(.borderedProminent).tint(.mintVital).disabled(connecting || !HealthService.available)
            Button("Utforsk med demodata") { model.onboarded = true; Task { await model.setDemo(true) } }.frame(maxWidth: .infinity).padding(8)
            Button("Fortsett uten tilgang") { model.onboarded = true; Task { await model.refresh() } }.font(.footnote).foregroundStyle(.secondary).frame(maxWidth: .infinity)
            if let error = model.error { Text(error).font(.footnote).foregroundStyle(.secondary) }
        }
    }
}
struct DataStatus: View {
    @EnvironmentObject private var model: AppModel
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(model.demo ? "Demodata" : "Apple Helse · registrerte målinger", systemImage: model.demo ? "sparkles" : "heart.fill")
                .font(.caption.weight(.medium)).foregroundStyle(model.demo ? Color.orangeVital : Color.mintVital)
            if let error = model.error { Text(error).font(.footnote).foregroundStyle(.secondary) }
            if model.loading { ProgressView("Oppdaterer helseoversikten …").font(.caption) }
        }
    }
}
struct DashboardView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let openSettings: () -> Void
    private var greeting: String {
        switch Calendar.current.component(.hour, from: .now) {
        case 5..<10: return "God morgen"
        case 10..<18: return "God dag"
        default: return "God kveld"
        }
    }
    var body: some View {
        Page {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("VITAL").font(.caption2.weight(.bold)).tracking(4).foregroundStyle(.secondary)
                    Text(greeting).font(.largeTitle.weight(.bold))
                    Text(Date.now.norwegianDate.capitalized).font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
                Button(action: openSettings) { Image(systemName: "person.crop.circle").font(.system(size: 32)).foregroundStyle(.secondary).padding(5) }.accessibilityLabel("Åpne innstillinger")
            }
            DataStatus()
            NavigationLink { StepsDetailView() } label: {
                Card {
                    HStack { MetricTitle(title: "Skritt i dag", symbol: "figure.walk", color: .mintVital); Spacer(); Image(systemName: "arrow.up.right").foregroundStyle(.secondary) }
                    HStack {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(model.data.steps.isEmpty ? "–" : model.todaySteps.number).font(.system(size: 44, weight: .bold, design: .rounded)).minimumScaleFactor(0.6)
                                .contentTransition(.numericText()).animation(reduceMotion ? nil : .easeOut(duration: 0.3), value: model.todaySteps)
                            Text("av \(model.goal.number) skritt").font(.subheadline).foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 10)
                        GoalRing(progress: model.todaySteps / model.goal, goal: model.goal)
                    }
                    StepsChart(readings: model.data.hourly, hourly: true, compact: true)
                    HStack {
                        Label(model.distance(model.total(model.data.distance, day: model.today)), systemImage: "location")
                        Spacer()
                        Text(model.todaySteps >= model.goal ? "Dagens mål er nådd!" : "Ett skritt om gangen")
                    }.font(.caption).foregroundStyle(.secondary)
                    Text("Dagens tall oppdateres gjennom dagen.").font(.caption2).foregroundStyle(.secondary)
                }
            }.buttonStyle(.plain)
            NavigationLink { HeartDetailView() } label: {
                Card {
                    MetricTitle(title: "Puls", symbol: "heart.fill", color: .coral)
                    if let latest = model.data.pulse.last {
                        HStack(alignment: .firstTextBaseline) {
                            Text(latest.value.number).font(.system(size: 36, weight: .bold, design: .rounded))
                            Text("slag/min").foregroundStyle(.secondary)
                            Spacer(); Image(systemName: "chevron.right").font(.caption).foregroundStyle(.secondary)
                        }
                        PulseChart(readings: model.data.pulse.filter { Calendar.current.isDate($0.date, inSameDayAs: latest.date) }, compact: true)
                        Text("Siste måling \(latest.date.vitalFormatted(date: .abbreviated, time: .shortened)) · \(latest.source)").font(.caption).foregroundStyle(.secondary)
                    } else { EmptyMetric(text: "Ingen pulsmålinger. Apple Watch eller en kompatibel pulsmåler kan registrere puls i Helse.") }
                }
            }.buttonStyle(.plain)
            Card {
                MetricTitle(title: "I bevegelse", symbol: "flame.fill", color: .orangeVital)
                ValueRow(name: "Aktiv energi", value: metric(model.data.energy, suffix: "kcal"))
                ValueRow(name: "Trening", value: metric(model.data.exercise, suffix: "min"))
                ValueRow(name: "Gå- og løpedistanse", value: model.data.distance.isEmpty ? "Ingen data" : model.distance(model.total(model.data.distance, day: model.today)))
            }
            SleepCard()
            Card {
                MetricTitle(title: "Uken din", symbol: "chart.bar.fill", color: .mintVital)
                StepsChart(readings: model.week)
                if let average = Analytics.mean(model.week) { ValueRow(name: "Snitt per registrerte dag", value: "\(average.number) skritt") }
                WeeklySummary()
            }
        }.toolbar(.hidden, for: .navigationBar).refreshable { await model.refresh() }
            .sensoryFeedback(.success, trigger: model.todaySteps >= model.goal)
    }
    private func metric(_ readings: [Reading], suffix: String) -> String {
        readings.contains { Calendar.current.isDateInToday($0.date) } ? "\(model.total(readings, day: model.today).number) \(suffix)" : "Ingen data"
    }
}
struct WeeklySummary: View {
    @EnvironmentObject private var model: AppModel
    var body: some View {
        if let change = model.weeklyChange {
            Text("Du har gått \(abs(change).number) % \(change >= 0 ? "flere" : "færre") skritt de siste sju hele dagene enn de sju foregående.").font(.subheadline).foregroundStyle(.secondary)
        } else { Text("En ukesammenligning vises når begge periodene har sju registrerte dager.").font(.caption).foregroundStyle(.secondary) }
    }
}
struct SleepCard: View {
    @EnvironmentObject private var model: AppModel
    var body: some View {
        Card {
            MetricTitle(title: "Søvn i natt", symbol: "moon.fill", color: .lavender)
            let segments = model.lastNight
            let duration = Analytics.sleepDuration(segments)
            if duration > 0 {
                Text("\(Int(duration / 3600)) t \(Int(duration.truncatingRemainder(dividingBy: 3600) / 60)) min").font(.system(size: 32, weight: .bold, design: .rounded))
                Chart(segments) { segment in
                    BarMark(xStart: .value("Fra", segment.start), xEnd: .value("Til", segment.end), y: .value("Fase", segment.stage))
                        .foregroundStyle(Color.lavender.opacity(segment.stage == "Dyp" ? 1 : 0.55)).cornerRadius(3)
                }.frame(height: 110)
                if let start = segments.map(\.start).min(), let end = segments.map(\.end).max() {
                    Text("\(start.vitalFormatted(date: .omitted, time: .shortened))–\(end.vitalFormatted(date: .omitted, time: .shortened)) · Registrert søvn").font(.caption).foregroundStyle(.secondary)
                }
                let priorDurations = (1...7).compactMap { offset -> Double? in
                    let start = Calendar.current.date(byAdding: .day, value: -offset, to: model.today)!.addingTimeInterval(-12 * 3600)
                    let end = Calendar.current.date(byAdding: .day, value: 1, to: start)!
                    let value = Analytics.sleepDuration(model.data.sleep.filter { $0.start >= start && $0.start < end })
                    return value > 0 ? value : nil
                }
                if let average = priorDurations.isEmpty ? nil : priorDurations.reduce(0, +) / Double(priorDurations.count) {
                    Text("Snitt for \(priorDurations.count) tidligere registrerte netter: \((average / 3600).decimal) t").font(.caption).foregroundStyle(.secondary)
                }
            } else { EmptyMetric(text: "Ingen søvndata i natt. Registrer søvn med en kompatibel enhet eller i Helse.") }
        }
    }
}
struct ActivityView: View {
    @EnvironmentObject private var model: AppModel
    var body: some View {
        Page {
            DataStatus()
            NavigationLink { StepsDetailView() } label: {
                Card { MetricTitle(title: "Skritt og distanse", symbol: "figure.walk", color: .mintVital); Text("\(model.todaySteps.number) skritt").font(.largeTitle.bold()); Text("Se perioder og detaljer →").font(.subheadline).foregroundStyle(.secondary) }
            }.buttonStyle(.plain)
            Card {
                MetricTitle(title: "Aktiv energi · siste sju dager", symbol: "flame", color: .orangeVital)
                let values = model.data.energy.filter { $0.date >= Period.week.start(ending: .now) }
                if values.isEmpty { EmptyMetric(text: "Ingen energimålinger") }
                else {
                    Chart(values) { item in BarMark(x: .value("Dag", item.date, unit: .day), y: .value("kcal", item.value)).foregroundStyle(Color.orangeVital).cornerRadius(4) }.frame(height: 180)
                }
            }
            Card {
                MetricTitle(title: "Siste treningsøkter", symbol: "figure.run", color: .orangeVital)
                if model.data.workouts.isEmpty { EmptyMetric(text: "Ingen registrerte treningsøkter") }
                ForEach(model.data.workouts.suffix(10).reversed()) { workout in
                    VStack(alignment: .leading, spacing: 5) {
                        ValueRow(name: workout.name, value: "\(workout.minutes.number) min")
                        Text(workout.date.norwegianDate).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }.navigationTitle("Aktivitet").refreshable { await model.refresh() }
    }
}
struct StepsDetailView: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var period: Period = .week
    @State private var end = Date.now
    private var start: Date { period.start(ending: end) }
    private var upper: Date { Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: end))! }
    private var readings: [Reading] { model.data.steps.filter { $0.date >= start && $0.date < upper } }
    private var chartReadings: [Reading] {
        if period == .day { return model.data.hourly.filter { $0.date >= start && $0.date < upper } }
        if period == .year || period == .halfYear { return Analytics.monthly(readings) }
        return readings
    }
    var body: some View {
        Page {
            DataStatus()
            Picker("Periode", selection: $period) { ForEach(Period.allCases) { Text($0.rawValue).tag($0) } }.pickerStyle(.segmented)
            if period != .day { DatePicker("Til og med", selection: $end, in: ...Date.now, displayedComponents: .date) }
            Card {
                Text(readings.reduce(0) { $0 + $1.value }.number).font(.system(size: 46, weight: .bold, design: .rounded)).contentTransition(.numericText())
                Text("skritt · \(start.vitalFormatted(date: .abbreviated, time: .omitted))–\(end.vitalFormatted(date: .abbreviated, time: .omitted))").font(.caption).foregroundStyle(.secondary)
                if period == .year || period == .halfYear {
                    Chart(chartReadings) { item in BarMark(x: .value("Måned", item.date, unit: .month), y: .value("Skritt", item.value)).foregroundStyle(Color.mintVital).cornerRadius(4) }.frame(height: 210)
                    ForEach(chartReadings) { item in ValueRow(name: item.date.formatted(.dateTime.locale(Locale(identifier: "nb_NO")).month(.wide).year()), value: item.value.number) }
                } else {
                    StepsChart(readings: chartReadings, average: model.showAverage && period != .day ? Analytics.movingAverage(model.data.steps).filter { $0.date >= start && $0.date < upper } : [], hourly: period == .day)
                }
                if period == .day { Text("Timefordeling for i dag").font(.caption).foregroundStyle(.secondary) }
                if model.showAverage && period != .day && period != .year && period != .halfYear { Text("Oransje linje: sjudagers glidende snitt").font(.caption).foregroundStyle(.secondary) }
            }
            Card {
                ValueRow(name: "Snitt per registrerte dag", value: Analytics.mean(readings).map { "\($0.number) skritt" } ?? "Ingen data")
                ValueRow(name: "Registrerte dager", value: "\(readings.count)")
                ValueRow(name: "Distanse", value: model.distance(Analytics.sum(model.data.distance, from: start, to: upper)))
                ValueRow(name: "Beste dag", value: readings.max(by: { $0.value < $1.value }).map { "\($0.value.number) skritt" } ?? "Ingen data")
                ValueRow(name: "Dager med nådd mål", value: "\(readings.filter { $0.value >= model.goal }.count) av \(readings.count)")
                Text("Dager uten registrerte målinger inngår ikke i snittet. Dagens tall er foreløpige.").font(.caption).foregroundStyle(.secondary)
                if period != .day {
                    let count = Calendar.current.dateComponents([.day], from: start, to: upper).day ?? 0
                    let previousStart = Calendar.current.date(byAdding: .day, value: -count, to: start)!
                    let previous = model.data.steps.filter { $0.date >= previousStart && $0.date < start }
                    if previous.count == count, readings.count == count, let change = Analytics.change(current: readings.reduce(0) { $0 + $1.value }, previous: previous.reduce(0) { $0 + $1.value }) {
                        Text("\(abs(change).number) % \(change >= 0 ? "flere" : "færre") skritt enn forrige periode med like mange kalenderdager. Siste dag kan være ufullstendig.").font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            Card { MetricTitle(title: "Aktivitetskalender", symbol: "calendar", color: .mintVital); Heatmap(readings: model.data.steps, goal: model.goal) }
        }.navigationTitle("Skritt").animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: period)
            .onChange(of: period) { _, value in if value == .day { end = .now } }
    }
}
struct HeartDetailView: View {
    @EnvironmentObject private var model: AppModel
    @State private var date = Date.now
    @State private var days = 1
    private var start: Date { Calendar.current.date(byAdding: .day, value: 1 - days, to: Calendar.current.startOfDay(for: date))! }
    private var upper: Date { Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: date))! }
    private var readings: [Reading] { model.data.pulse.filter { $0.date >= start && $0.date < upper } }
    var body: some View {
        Page {
            DataStatus()
            DatePicker("Til og med", selection: $date, in: ...Date.now, displayedComponents: .date)
            Picker("Periode", selection: $days) { Text("Dag").tag(1); Text("7 dager").tag(7); Text("30 dager").tag(30) }.pickerStyle(.segmented)
            Card {
                MetricTitle(title: "Registrert puls", symbol: "heart.fill", color: .coral)
                if let latest = readings.last {
                    Text("\(latest.value.number) slag/min").font(.largeTitle.bold())
                    Text("Siste måling \(latest.date.vitalFormatted(date: .abbreviated, time: .shortened)) · \(latest.source)").font(.caption).foregroundStyle(.secondary)
                    PulseChart(readings: readings)
                    ValueRow(name: "Laveste / høyeste i perioden", value: "\((readings.map(\.value).min() ?? 0).number) / \((readings.map(\.value).max() ?? 0).number)")
                    Text("Punkter viser registrerte målinger. Opphold over 15 minutter vises som brudd i linjen.").font(.caption).foregroundStyle(.secondary)
                } else { EmptyMetric(text: "Ingen målinger i perioden. En kompatibel klokke eller pulsmåler kan legge data i Helse.") }
            }
            Card {
                MetricTitle(title: "Hvilepuls", symbol: "heart", color: .coral)
                let values = model.data.resting.filter { $0.date >= start && $0.date < upper }
                if values.isEmpty { EmptyMetric(text: "Ingen registrert hvilepuls") }
                else { PulseChart(readings: values); ValueRow(name: "Gjennomsnitt", value: "\((Analytics.mean(values) ?? 0).number) slag/min") }
                let hrv = model.data.hrv.filter { $0.date >= start && $0.date < upper }
                if let average = Analytics.mean(hrv) { ValueRow(name: "HRV · gjennomsnitt", value: "\(average.decimal) ms") }
            }
            if !readings.isEmpty {
                Card {
                    MetricTitle(title: "Pulsområde per dag", symbol: "chart.bar.xaxis", color: .coral)
                    let grouped = Dictionary(grouping: readings) { Calendar.current.startOfDay(for: $0.date) }
                    Chart(grouped.keys.sorted(), id: \.self) { day in
                        let values = grouped[day]!.map(\.value)
                        BarMark(x: .value("Dag", day, unit: .day), yStart: .value("Laveste", values.min()!), yEnd: .value("Høyeste", values.max()!))
                            .foregroundStyle(Color.coral.opacity(0.5)).cornerRadius(6)
                    }.chartYScale(domain: .automatic(includesZero: false)).frame(height: 170)
                }
            }
            let workouts = model.data.workouts.filter { $0.date >= start && $0.date < upper }
            if !workouts.isEmpty {
                Card {
                    MetricTitle(title: "Puls under trening", symbol: "figure.run", color: .coral)
                    ForEach(workouts.suffix(5)) { workout in
                        let samples = readings.filter { $0.date >= workout.date && $0.date <= workout.date.addingTimeInterval(workout.minutes * 60) }
                        ValueRow(name: workout.name, value: Analytics.mean(samples).map { "\($0.number) slag/min" } ?? "Ingen pulsmålinger")
                        Text(workout.date.vitalFormatted(date: .abbreviated, time: .shortened)).font(.caption).foregroundStyle(.secondary)
                    }
                    Text("Gjennomsnitt av registrerte målinger i øktens tidsrom.").font(.caption).foregroundStyle(.secondary)
                }
            }
            Text("VITAL viser registrerte helseopplysninger og gir ingen medisinske vurderinger.").font(.footnote).foregroundStyle(.secondary)
        }.navigationTitle("Puls")
    }
}
struct TrendsView: View {
    @EnvironmentObject private var model: AppModel
    var body: some View {
        Page {
            DataStatus()
            Card {
                MetricTitle(title: "Små steg. Store mønstre.", symbol: "chart.xyaxis.line", color: .mintVital)
                WeeklySummary()
                let achieved = model.week.filter { $0.value >= model.goal }.count
                Text("Du har nådd dagens skrittmål på \(achieved) av \(model.week.count) registrerte dager den siste uken.").font(.subheadline)
                let weekdayGroups = Dictionary(grouping: model.data.steps) { Calendar.current.component(.weekday, from: $0.date) }
                let weekdayMeans = weekdayGroups.compactMapValues { Analytics.mean($0) }
                if model.data.steps.count >= 14, let bestDay = weekdayMeans.max(by: { $0.value < $1.value }) {
                    let name = DateFormatter.norwegianWeekdays[bestDay.key - 1].lowercased()
                    Text("Du går i snitt mest på \(name). Basert på registrerte dager i hentet historikk.").font(.subheadline)
                }
                if let best = model.data.steps.max(by: { $0.value < $1.value }) {
                    ValueRow(name: "Personlig beste i hentet historikk", value: "\(best.value.number)")
                    Text(best.date.norwegianDate).font(.caption).foregroundStyle(.secondary)
                }
            }
            Card {
                MetricTitle(title: "Skritt · siste 30 dager", symbol: "figure.walk", color: .mintVital)
                StepsChart(readings: model.data.steps.filter { $0.date >= Period.month.start(ending: .now) })
            }
            Card {
                MetricTitle(title: "Distanse · siste sju dager", symbol: "location", color: .mintVital)
                let values = model.data.distance.filter { $0.date >= Period.week.start(ending: .now) }
                if values.isEmpty { EmptyMetric(text: "Ingen registrert distanse") }
                else {
                    Chart(values) { value in BarMark(x: .value("Dag", value.date, unit: .day), y: .value(model.miles ? "mi" : "km", model.miles ? value.value * 0.621371 : value.value)).foregroundStyle(Color.mintVital).cornerRadius(4) }.frame(height: 160)
                }
            }
            Card {
                MetricTitle(title: "Hvilepuls · siste 30 dager", symbol: "heart", color: .coral)
                let recent = model.data.resting.filter { $0.date >= Period.month.start(ending: .now) }
                if recent.isEmpty { EmptyMetric(text: "Ingen målinger av hvilepuls") } else { PulseChart(readings: recent) }
            }
            Card { MetricTitle(title: "Din rytme", symbol: "calendar", color: .mintVital); Heatmap(readings: model.data.steps, goal: model.goal) }
        }.navigationTitle("Trender").refreshable { await model.refresh() }
    }
}
struct SettingsView: View {
    @EnvironmentObject private var model: AppModel
    @State private var reminders = false
    @State private var notificationMessage: String?
    var body: some View {
        Form {
            Section("Apple Helse") {
                DataStatus()
                Button("Be om lesetilgang") { Task { await model.connect() } }.disabled(!HealthService.available)
                Button("Oppdater nå") { Task { await model.refresh() } }.disabled(model.loading)
                if let date = model.lastRefresh { LabeledContent("Sist hentet", value: date.vitalFormatted(date: .abbreviated, time: .shortened)) }
                Text("Apple oppgir ikke om lesetilgang er avslått. Manglende målinger kan bety at data eller tilgang mangler. Administrer tilgang i Helse → profil → Apper → VITAL.").font(.caption)
            }
            Section("Dine mål") {
                Stepper("Skrittmål: \(model.goal.number)", value: $model.goal, in: 1000...40000, step: 500)
                Toggle("Vis distanse i miles", isOn: $model.miles)
                Text("Målhistorikken beregnes med ditt nåværende mål.").font(.caption)
            }
            Section("Utseende") {
                Picker("Fargetema", selection: $model.appearance) { Text("System").tag(0); Text("Lyst").tag(1); Text("Mørkt").tag(2) }
                Toggle("Vis sjudagerssnitt i skrittdiagram", isOn: $model.showAverage)
            }
            Section("Demonstrasjon") {
                Toggle("Bruk demodata", isOn: Binding(get: { model.demo }, set: { value in Task { await model.setDemo(value) } }))
                Text("Demodata er eksempler, ikke dine målinger. Bytte av modus erstatter kun oversikten i VITAL og endrer aldri Apple Helse.").font(.caption)
            }
            Section("Påminnelser") {
                Toggle("Daglig påminnelse kl. 19", isOn: Binding(get: { reminders }, set: { enabled in
                    Task { await updateReminders(enabled) }
                }))
                if let notificationMessage { Text(notificationMessage).font(.caption) }
            }
            Section("Personvern") {
                Label("Helseopplysningene blir på enheten", systemImage: "lock.shield")
                Text("VITAL leser kun fra Apple Helse. Ingen konto, analyseverktøy eller server. Helseopplysninger lagres ikke i appens innstillinger. Valgfrie påminnelser planlegges lokalt på enheten.").font(.footnote)
            }
            Section { LabeledContent("Versjon", value: "1.0 (1)"); Text("Laget for et klarere bilde av hverdagen.").font(.caption).foregroundStyle(.secondary) }
        }.navigationTitle("Innstillinger")
            .task {
                let pending = await UNUserNotificationCenter.current().pendingNotificationRequests()
                reminders = pending.contains { $0.identifier == "vital.daily" }
            }
    }
    @MainActor private func updateReminders(_ enabled: Bool) async {
        let center = UNUserNotificationCenter.current()
        notificationMessage = nil
        if !enabled {
            center.removePendingNotificationRequests(withIdentifiers: ["vital.daily"])
            reminders = false
            return
        }
        do {
            guard try await center.requestAuthorization(options: [.alert, .sound]) else {
                notificationMessage = "Varsler er ikke tillatt. Du kan endre dette i iPhone-innstillingene."
                reminders = false
                return
            }
            let content = UNMutableNotificationContent()
            content.title = "Et øyeblikk for deg"
            content.body = "Se dagens aktivitet i VITAL."
            content.sound = .default
            let trigger = UNCalendarNotificationTrigger(dateMatching: DateComponents(hour: 19), repeats: true)
            try await center.add(UNNotificationRequest(identifier: "vital.daily", content: content, trigger: trigger))
            reminders = true
        } catch { notificationMessage = "Kunne ikke planlegge påminnelsen. Prøv igjen."; reminders = false }
    }
}
