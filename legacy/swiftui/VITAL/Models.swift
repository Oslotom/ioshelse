import Foundation

struct Reading: Identifiable, Equatable {
    let date: Date
    let value: Double
    var source: String = ""
    var id: Date { date }
}
struct SleepSegment: Identifiable {
    let id = UUID()
    let start: Date
    let end: Date
    let stage: String
    let asleep: Bool
}
struct Workout: Identifiable {
    let id = UUID()
    let date: Date
    let minutes: Double
    let name: String
}
struct HealthSnapshot {
    var steps: [Reading] = []
    var hourly: [Reading] = []
    var distance: [Reading] = [] // kilometers
    var energy: [Reading] = []
    var exercise: [Reading] = []
    var pulse: [Reading] = []
    var resting: [Reading] = []
    var hrv: [Reading] = [] // milliseconds
    var sleep: [SleepSegment] = []
    var workouts: [Workout] = []
}
enum Period: String, CaseIterable, Identifiable {
    case day = "Dag", week = "Uke", month = "Måned", halfYear = "6 md.", year = "År"
    var id: String { rawValue }
    func start(ending end: Date, calendar: Calendar = .current) -> Date {
        switch self {
        case .day: return calendar.startOfDay(for: end)
        case .week: return calendar.date(byAdding: .day, value: -6, to: calendar.startOfDay(for: end))!
        case .month: return calendar.date(byAdding: .day, value: -29, to: calendar.startOfDay(for: end))!
        case .halfYear: return calendar.date(byAdding: .month, value: -6, to: calendar.startOfDay(for: end))!
        case .year: return calendar.date(byAdding: .year, value: -1, to: calendar.startOfDay(for: end))!
        }
    }
}
enum Analytics {
    static func sum(_ readings: [Reading], from start: Date, to end: Date) -> Double {
        readings.filter { $0.date >= start && $0.date < end }.reduce(0) { $0 + $1.value }
    }
    static func mean(_ readings: [Reading]) -> Double? {
        readings.isEmpty ? nil : readings.reduce(0) { $0 + $1.value } / Double(readings.count)
    }
    static func change(current: Double, previous: Double) -> Double? {
        previous > 0 ? (current - previous) / previous * 100 : nil
    }
    static func movingAverage(_ readings: [Reading], calendar: Calendar = .current) -> [Reading] {
        readings.sorted { $0.date < $1.date }.compactMap { item in
            let start = calendar.date(byAdding: .day, value: -6, to: item.date)!
            let window = readings.filter { $0.date >= start && $0.date <= item.date }
            guard window.count == 7 else { return nil }
            return Reading(date: item.date, value: mean(window)!)
        }
    }
    // Split at long gaps: a line must never suggest continuous sensor coverage.
    static func pulseSeries(_ readings: [Reading]) -> [[Reading]] {
        var result: [[Reading]] = []
        for sample in readings.sorted(by: { $0.date < $1.date }) {
            if let last = result.last?.last, sample.date.timeIntervalSince(last.date) <= 900 {
                result[result.count - 1].append(sample)
            } else { result.append([sample]) }
        }
        return result
    }
    // Union intervals so overlapping sources/stages cannot inflate sleep duration.
    static func sleepDuration(_ segments: [SleepSegment]) -> TimeInterval {
        let intervals = segments.filter(\.asleep).sorted { $0.start < $1.start }
        var total: TimeInterval = 0
        var lower: Date?
        var upper: Date?
        for item in intervals {
            if let end = upper, item.start <= end { upper = max(end, item.end) }
            else {
                if let start = lower, let end = upper { total += end.timeIntervalSince(start) }
                lower = item.start; upper = item.end
            }
        }
        if let start = lower, let end = upper { total += end.timeIntervalSince(start) }
        return total
    }
    static func monthly(_ readings: [Reading], calendar: Calendar = .current) -> [Reading] {
        let groups = Dictionary(grouping: readings) { calendar.dateInterval(of: .month, for: $0.date)!.start }
        return groups.map { Reading(date: $0.key, value: $0.value.reduce(0) { $0 + $1.value }) }.sorted { $0.date < $1.date }
    }
}
enum DemoData {
    static func make(now: Date = .now, calendar: Calendar = .current) -> HealthSnapshot {
        var data = HealthSnapshot()
        let today = calendar.startOfDay(for: now)
        // Deterministic fixtures: never used for insights in HealthKit mode.
        for offset in -399...0 {
            let day = calendar.date(byAdding: .day, value: offset, to: today)!
            let value = offset == 0 ? 8432.0 : 4800 + Double((offset + 400) * 791 % 8600)
            data.steps.append(Reading(date: day, value: value))
            data.distance.append(Reading(date: day, value: value * 0.00072))
            data.energy.append(Reading(date: day, value: value * 0.043))
            data.exercise.append(Reading(date: day, value: Double(18 + (offset + 400) * 7 % 48)))
            data.resting.append(Reading(date: day, value: 57 + sin(Double(offset) / 8) * 4))
            data.hrv.append(Reading(date: day, value: 44 + sin(Double(offset) / 6) * 9))
            if offset % 3 == 0 { data.workouts.append(Workout(date: day, minutes: 35, name: "Gåtur")) }
        }
        let currentHour = calendar.component(.hour, from: now)
        let weights = (0...currentHour).map { Double(($0 * 7 + 3) % 13 + 1) }
        let total = weights.reduce(0, +)
        for hour in 0...currentHour {
            data.hourly.append(Reading(date: calendar.date(byAdding: .hour, value: hour, to: today)!, value: 8432 * weights[hour] / total))
        }
        for offset in -29...0 {
            let day = calendar.date(byAdding: .day, value: offset, to: today)!
            for minute in stride(from: 0, through: 90, by: 5) {
                let date = calendar.date(byAdding: .minute, value: 7 * 60 + minute, to: day)!
                if date <= now {
                    data.pulse.append(Reading(date: date, value: 67 + Double((minute * 7 + offset + 30) % 24), source: "Demoklokke"))
                }
            }
        }
        let bedtime = calendar.date(byAdding: .hour, value: -2, to: today)!
        for (index, stage) in ["Lett", "Dyp", "Lett", "REM", "Lett", "REM", "Lett", "Lett"].enumerated() {
            let start = bedtime.addingTimeInterval(Double(index) * 3600)
            let end = min(now, bedtime.addingTimeInterval(Double(index + 1) * 3600))
            if start < end { data.sleep.append(SleepSegment(start: start, end: end, stage: stage, asleep: true)) }
        }
        return data
    }
}
extension Double {
    var number: String { formatted(.number.locale(Locale(identifier: "nb_NO")).precision(.fractionLength(0))) }
    var decimal: String { formatted(.number.locale(Locale(identifier: "nb_NO")).precision(.fractionLength(1))) }
}
extension Date {
    var norwegianDate: String { formatted(.dateTime.locale(Locale(identifier: "nb_NO")).weekday(.wide).day().month(.wide)) }
}

extension Date {
    func vitalFormatted(date: Date.FormatStyle.DateStyle, time: Date.FormatStyle.TimeStyle) -> String {
        formatted(Date.FormatStyle(date: date, time: time).locale(Locale(identifier: "nb_NO")))
    }
}
extension DateFormatter {
    static var norwegianWeekdays: [String] {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "nb_NO")
        return formatter.weekdaySymbols
    }
}
