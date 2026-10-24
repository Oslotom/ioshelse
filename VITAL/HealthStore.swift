import Foundation
import HealthKit

final class HealthService {
    private let store = HKHealthStore()
    private var observers: [HKObserverQuery] = []
    static var available: Bool { HKHealthStore.isHealthDataAvailable() }
    private let quantities: [HKQuantityTypeIdentifier] = [.stepCount, .distanceWalkingRunning, .heartRate, .restingHeartRate, .heartRateVariabilitySDNN, .activeEnergyBurned, .appleExerciseTime]
    private var readTypes: Set<HKObjectType> {
        var types = Set<HKObjectType>(quantities.compactMap { HKQuantityType.quantityType(forIdentifier: $0) })
        types.insert(HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!)
        types.insert(HKObjectType.workoutType())
        return types
    }
    func authorize() async throws {
        guard Self.available else { return }
        try await store.requestAuthorization(toShare: [], read: readTypes)
    }
    func observe(onChange: @escaping () -> Void) {
        guard observers.isEmpty, Self.available else { return }
        for type in readTypes.compactMap({ $0 as? HKSampleType }) {
            let query = HKObserverQuery(sampleType: type, predicate: nil) { _, completion, error in
                if error == nil { onChange() }
                completion()
            }
            observers.append(query)
            store.execute(query)
        }
        // Foreground observers plus refresh on activation. No background delivery entitlement required.
    }
    private func statistics(_ identifier: HKQuantityTypeIdentifier, unit: HKUnit, start: Date, end: Date, hourly: Bool = false) async throws -> [Reading] {
        let type = HKQuantityType.quantityType(forIdentifier: identifier)!
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let interval = hourly ? DateComponents(hour: 1) : DateComponents(day: 1)
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsCollectionQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum, anchorDate: Calendar.current.startOfDay(for: start), intervalComponents: interval)
            query.initialResultsHandler = { _, results, error in
                if let error { continuation.resume(throwing: error); return }
                var readings: [Reading] = []
                results?.enumerateStatistics(from: start, to: end) { stats, _ in
                    if stats.startDate < end, let quantity = stats.sumQuantity() {
                        readings.append(Reading(date: stats.startDate, value: quantity.doubleValue(for: unit)))
                    }
                }
                continuation.resume(returning: readings)
            }
            self.store.execute(query)
        }
    }
    private func samples(_ type: HKSampleType, start: Date, end: Date) async throws -> [HKSample] {
        try await withCheckedThrowingContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(withStart: start, end: end)
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]) { _, samples, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: samples ?? []) }
            }
            self.store.execute(query)
        }
    }
    private func quantities(_ identifier: HKQuantityTypeIdentifier, unit: HKUnit, start: Date, end: Date) async throws -> [Reading] {
        try await samples(HKQuantityType.quantityType(forIdentifier: identifier)!, start: start, end: end).compactMap { sample in
            guard let sample = sample as? HKQuantitySample else { return nil }
            return Reading(date: sample.startDate, value: sample.quantity.doubleValue(for: unit), source: sample.sourceRevision.source.name)
        }
    }
    func load(now: Date = .now) async throws -> HealthSnapshot {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: now)
        let start = calendar.date(byAdding: .day, value: -740, to: today)!
        let recent = calendar.date(byAdding: .day, value: -60, to: today)!
        var data = HealthSnapshot()
        // Statistics queries use HealthKit's merged cumulative totals, not sums of overlapping raw samples.
        data.steps = try await statistics(.stepCount, unit: .count(), start: start, end: now)
        data.hourly = try await statistics(.stepCount, unit: .count(), start: today, end: now, hourly: true)
        data.distance = try await statistics(.distanceWalkingRunning, unit: .meterUnit(with: .kilo), start: start, end: now)
        data.energy = try await statistics(.activeEnergyBurned, unit: .kilocalorie(), start: start, end: now)
        data.exercise = try await statistics(.appleExerciseTime, unit: .minute(), start: start, end: now)
        data.pulse = try await quantities(.heartRate, unit: HKUnit.count().unitDivided(by: .minute()), start: recent, end: now)
        data.resting = try await quantities(.restingHeartRate, unit: HKUnit.count().unitDivided(by: .minute()), start: start, end: now)
        data.hrv = try await quantities(.heartRateVariabilitySDNN, unit: .secondUnit(with: .milli), start: recent, end: now)
        let sleepSamples = try await samples(HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!, start: calendar.date(byAdding: .day, value: -8, to: today)!, end: now)
        // Prefer one source for the sleep timeline; overlapping sources are not separate sleep phases.
        let categories = sleepSamples.compactMap { $0 as? HKCategorySample }
        let groups = Dictionary(grouping: categories) { $0.sourceRevision.source.bundleIdentifier }
        let preferred = groups.values.max { $0.count < $1.count } ?? []
        data.sleep = preferred.compactMap { sample in
            let stage: String
            let asleep: Bool
            switch sample.value {
            case HKCategoryValueSleepAnalysis.asleepCore.rawValue: stage = "Lett"; asleep = true
            case HKCategoryValueSleepAnalysis.asleepDeep.rawValue: stage = "Dyp"; asleep = true
            case HKCategoryValueSleepAnalysis.asleepREM.rawValue: stage = "REM"; asleep = true
            case HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue: stage = "Søvn"; asleep = true
            case HKCategoryValueSleepAnalysis.awake.rawValue: stage = "Våken"; asleep = false
            default: return nil
            }
            return SleepSegment(start: sample.startDate, end: sample.endDate, stage: stage, asleep: asleep)
        }
        data.workouts = try await samples(.workoutType(), start: recent, end: now).compactMap { sample in
            guard let workout = sample as? HKWorkout else { return nil }
            let name: String
            switch workout.workoutActivityType {
            case .walking: name = "Gåtur"
            case .running: name = "Løping"
            case .cycling: name = "Sykling"
            case .swimming: name = "Svømming"
            default: name = "Treningsøkt"
            }
            return Workout(date: workout.startDate, minutes: workout.duration / 60, name: name)
        }
        return data
    }
}
