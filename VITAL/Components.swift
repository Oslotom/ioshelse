import SwiftUI
import Charts

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
    }
    static let mintVital = Color(hex: 0x39B8A5)
    static let coral = Color(hex: 0xFF647C)
    static let lavender = Color(hex: 0x8175E8)
    static let orangeVital = Color(hex: 0xF4A261)
}
struct Card<Content: View>: View {
    @Environment(\.colorScheme) private var scheme
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 18) { content }
            .frame(maxWidth: .infinity, alignment: .leading).padding(22)
            .background(scheme == .dark ? Color(uiColor: .secondarySystemGroupedBackground) : .white, in: RoundedRectangle(cornerRadius: 26))
            .shadow(color: .black.opacity(0.025), radius: 16, y: 6)
    }
}
struct Page<Content: View>: View {
    @Environment(\.colorScheme) private var scheme
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView { VStack(alignment: .leading, spacing: 20) { content }.padding(20).padding(.bottom, 20) }
            .background(scheme == .dark ? Color(uiColor: .systemGroupedBackground) : Color(hex: 0xF7F8FA))
    }
}
struct MetricTitle: View {
    let title: String
    let symbol: String
    let color: Color
    var body: some View {
        Label(title, systemImage: symbol).font(.subheadline.weight(.semibold)).foregroundStyle(color)
    }
}
struct EmptyMetric: View {
    let text: String
    var body: some View {
        Label(text, systemImage: "waveform.path").font(.subheadline).foregroundStyle(.secondary).padding(.vertical, 12)
    }
}
struct GoalRing: View {
    let progress: Double
    let goal: Double
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        ZStack {
            Circle().stroke(Color.mintVital.opacity(0.12), lineWidth: 12)
            Circle().trim(from: 0, to: min(max(progress, 0), 1)).stroke(Color.mintVital, style: StrokeStyle(lineWidth: 12, lineCap: .round)).rotationEffect(.degrees(-90))
            VStack(spacing: 3) {
                Image(systemName: progress >= 1 ? "checkmark" : "figure.walk").font(.title2)
                Text("\((progress * 100).number) %").font(.caption.weight(.bold))
            }.foregroundStyle(Color.mintVital)
        }
        .frame(width: 102, height: 102)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.4), value: progress)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\((progress * 100).number) prosent av målet på \(goal.number) skritt")
    }
}
struct StepsChart: View {
    let readings: [Reading]
    var average: [Reading] = []
    var hourly = false
    var compact = false
    @State private var selection: Date?
    private var selected: Reading? {
        guard let selection else { return nil }
        return readings.min { abs($0.date.timeIntervalSince(selection)) < abs($1.date.timeIntervalSince(selection)) }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let selected, !compact {
                Text("\(selected.date.vitalFormatted(date: .abbreviated, time: hourly ? .shortened : .omitted)) · \(selected.value.number) skritt").font(.caption.monospacedDigit()).foregroundStyle(.secondary)
            }
            if readings.isEmpty { EmptyMetric(text: "Ingen registrerte skritt i perioden") }
            else {
                Chart {
                    ForEach(readings) { reading in
                        BarMark(x: .value("Tid", reading.date, unit: hourly ? .hour : .day), y: .value("Skritt", reading.value))
                            .foregroundStyle(Color.mintVital).cornerRadius(compact ? 2 : 4)
                            .opacity(selected == nil || selected?.id == reading.id ? 1 : 0.4)
                            .accessibilityLabel(reading.date.norwegianDate)
                            .accessibilityValue("\(reading.value.number) skritt")
                    }
                    ForEach(average) { reading in
                        LineMark(x: .value("Tid", reading.date), y: .value("Sjudagerssnitt", reading.value))
                            .foregroundStyle(Color.orangeVital).lineStyle(StrokeStyle(lineWidth: 2))
                    }
                    if let selected, !compact { RuleMark(x: .value("Valgt", selected.date)).foregroundStyle(.secondary.opacity(0.4)) }
                }
                .chartXSelection(value: $selection)
                .chartXAxis(compact ? .hidden : .automatic)
                .chartYAxis(compact ? .hidden : .automatic)
                .frame(height: compact ? 48 : 210)
            }
        }
    }
}
struct PulseChart: View {
    let readings: [Reading]
    var compact = false
    @State private var selection: Date?
    private var selected: Reading? {
        guard let selection else { return nil }
        return readings.min { abs($0.date.timeIntervalSince(selection)) < abs($1.date.timeIntervalSince(selection)) }
    }
    var body: some View {
        VStack(alignment: .leading) {
            if let selected, !compact { Text("\(selected.value.number) slag/min · \(selected.date.vitalFormatted(date: .abbreviated, time: .shortened))").font(.caption) }
            Chart {
                ForEach(Array(Analytics.pulseSeries(readings).enumerated()), id: \.offset) { index, series in
                    ForEach(series) { reading in
                        LineMark(x: .value("Tid", reading.date), y: .value("Puls", reading.value), series: .value("Måleserie", index))
                            .foregroundStyle(Color.coral).lineStyle(StrokeStyle(lineWidth: 2))
                        PointMark(x: .value("Tid", reading.date), y: .value("Puls", reading.value)).foregroundStyle(Color.coral).symbolSize(compact ? 5 : 12)
                    }
                }
                if let selected, !compact { RuleMark(x: .value("Tid", selected.date)).foregroundStyle(.secondary) }
            }.chartXSelection(value: $selection)
                .chartYScale(domain: .automatic(includesZero: false))
                .chartXAxis(compact ? .hidden : .automatic).chartYAxis(compact ? .hidden : .automatic)
                .frame(height: compact ? 55 : 210)
        }
    }
}
struct Heatmap: View {
    let readings: [Reading]
    let goal: Double
    private var days: [Date] {
        let today = Calendar.current.startOfDay(for: .now)
        return (-90...0).map { Calendar.current.date(byAdding: .day, value: $0, to: today)! }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("De siste 91 dagene").font(.caption).foregroundStyle(.secondary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 5), count: 13), spacing: 5) {
                ForEach(days, id: \.self) { date in
                    let value = readings.first { Calendar.current.isDate($0.date, inSameDayAs: date) }?.value
                    RoundedRectangle(cornerRadius: 3).fill(value == nil ? Color.secondary.opacity(0.08) : Color.mintVital.opacity(0.15 + min((value ?? 0) / goal, 1) * 0.85))
                        .aspectRatio(1, contentMode: .fit)
                        .accessibilityLabel("\(date.norwegianDate): \(value.map { "\($0.number) skritt" } ?? "ingen data")")
                }
            }
            Text("Lysere → færre skritt   Mørkere → nærmere målet").font(.caption2).foregroundStyle(.secondary)
        }
    }
}
struct ValueRow: View {
    let name: String
    let value: String
    var body: some View { HStack { Text(name).foregroundStyle(.secondary); Spacer(); Text(value).fontWeight(.semibold) }.font(.subheadline) }
}
