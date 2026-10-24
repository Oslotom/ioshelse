import SwiftUI

@MainActor
final class AppModel: ObservableObject {
    @Published var data = HealthSnapshot()
    @Published var loading = false
    @Published var error: String?
    @Published var lastRefresh: Date?
    @Published var demo: Bool { didSet { UserDefaults.standard.set(demo, forKey: "demo") } }
    @Published var goal: Double { didSet { UserDefaults.standard.set(goal, forKey: "goal") } }
    @Published var appearance: Int { didSet { UserDefaults.standard.set(appearance, forKey: "appearance") } }
    @Published var miles: Bool { didSet { UserDefaults.standard.set(miles, forKey: "miles") } }
    @Published var showAverage: Bool { didSet { UserDefaults.standard.set(showAverage, forKey: "average") } }
    @Published var onboarded: Bool { didSet { UserDefaults.standard.set(onboarded, forKey: "onboarded") } }
    private let health = HealthService()
    private var generation = 0
    init() {
        let defaults = UserDefaults.standard
        demo = defaults.bool(forKey: "demo")
        goal = defaults.object(forKey: "goal") as? Double ?? 10000
        appearance = defaults.object(forKey: "appearance") as? Int ?? 1
        miles = defaults.bool(forKey: "miles")
        showAverage = defaults.object(forKey: "average") as? Bool ?? true
        onboarded = defaults.bool(forKey: "onboarded")
        health.observe { [weak self] in Task { @MainActor in await self?.refresh() } }
    }
    var today: Date { Calendar.current.startOfDay(for: .now) }
    var todaySteps: Double { total(data.steps, day: today) }
    func total(_ readings: [Reading], day: Date) -> Double {
        Analytics.sum(readings, from: day, to: Calendar.current.date(byAdding: .day, value: 1, to: day)!)
    }
    func distance(_ kilometers: Double) -> String { "\((miles ? kilometers * 0.621371 : kilometers).decimal) \(miles ? "mi" : "km")" }
    var week: [Reading] { data.steps.filter { $0.date >= Period.week.start(ending: .now) } }
    var previousWeek: [Reading] {
        let start = Period.week.start(ending: .now)
        let previous = Calendar.current.date(byAdding: .day, value: -7, to: start)!
        return data.steps.filter { $0.date >= previous && $0.date < start }
    }
    var weeklyChange: Double? {
        // Only compare complete days; today's partial total is excluded from both windows.
        let end = today
        let start = Calendar.current.date(byAdding: .day, value: -7, to: end)!
        let prior = Calendar.current.date(byAdding: .day, value: -7, to: start)!
        let current = data.steps.filter { $0.date >= start && $0.date < end }
        let previous = data.steps.filter { $0.date >= prior && $0.date < start }
        guard current.count == 7, previous.count == 7 else { return nil }
        return Analytics.change(current: current.reduce(0) { $0 + $1.value }, previous: previous.reduce(0) { $0 + $1.value })
    }
    var lastNight: [SleepSegment] {
        let noon = Calendar.current.date(byAdding: .hour, value: -12, to: today)!
        return data.sleep.filter { $0.start >= noon }
    }
    func connect() async {
        do {
            try await health.authorize()
            demo = false
            onboarded = true
            await refresh()
        } catch { self.error = "Kunne ikke åpne Helse: \(error.localizedDescription)" }
    }
    func setDemo(_ enabled: Bool) async {
        generation += 1
        demo = enabled
        data = HealthSnapshot()
        lastRefresh = nil
        await refresh()
    }
    func refresh() async {
        generation += 1
        let ticket = generation
        loading = true; error = nil
        defer { if ticket == generation { loading = false } }
        if demo {
            data = DemoData.make(); lastRefresh = .now
            return
        }
        guard HealthService.available else {
            data = HealthSnapshot()
            error = "Apple Helse er ikke tilgjengelig her. Du kan utforske appen med tydelig merkede demodata."
            return
        }
        do {
            let snapshot = try await health.load()
            guard ticket == generation, !demo else { return }
            data = snapshot; lastRefresh = .now
        } catch {
            guard ticket == generation else { return }
            self.error = "Kunne ikke oppdatere Helse-data. Prøv igjen. \(error.localizedDescription)"
        }
    }
}

@main
struct VitalApp: App {
    @StateObject private var model = AppModel()
    @Environment(\.scenePhase) private var phase
    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(model)
                .environment(\.locale, Locale(identifier: "nb_NO"))
                .preferredColorScheme(model.appearance == 0 ? nil : model.appearance == 1 ? .light : .dark)
                .task { if model.onboarded { await model.refresh() } }
                .onChange(of: phase) { _, value in
                    if value == .active && model.onboarded { Task { await model.refresh() } }
                }
        }
    }
}
