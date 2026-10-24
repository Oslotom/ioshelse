import XCTest
@testable import VITAL

final class AnalyticsTests: XCTestCase {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Oslo")!
        return calendar
    }
    func testSleepUnionDoesNotDoubleCountSources() {
        let start = Date(timeIntervalSince1970: 0)
        let segments = [
            SleepSegment(start: start, end: start.addingTimeInterval(3600), stage: "Lett", asleep: true),
            SleepSegment(start: start.addingTimeInterval(1800), end: start.addingTimeInterval(5400), stage: "Dyp", asleep: true),
            SleepSegment(start: start, end: start.addingTimeInterval(7200), stage: "Våken", asleep: false)
        ]
        XCTAssertEqual(Analytics.sleepDuration(segments), 5400)
    }
    func testPulseGapIsNotConnected() {
        let start = Date(timeIntervalSince1970: 0)
        let samples = [Reading(date: start, value: 70), Reading(date: start.addingTimeInterval(300), value: 72), Reading(date: start.addingTimeInterval(3600), value: 80)]
        XCTAssertEqual(Analytics.pulseSeries(samples).map(\.count), [2, 1])
    }
    func testHalfOpenIntervalExcludesNextDay() {
        let start = Date(timeIntervalSince1970: 0)
        let samples = [Reading(date: start, value: 100), Reading(date: start.addingTimeInterval(86400), value: 200)]
        XCTAssertEqual(Analytics.sum(samples, from: start, to: start.addingTimeInterval(86400)), 100)
    }
    func testSevenDayAverageRequiresSevenDays() {
        let start = calendar.startOfDay(for: .now)
        let samples = (0..<7).map { Reading(date: calendar.date(byAdding: .day, value: $0, to: start)!, value: Double($0 + 1)) }
        let average = Analytics.movingAverage(samples, calendar: calendar)
        XCTAssertEqual(average.count, 1)
        XCTAssertEqual(average.first?.value, 4)
        XCTAssertTrue(Analytics.movingAverage(Array(samples.dropLast()), calendar: calendar).isEmpty)
    }
    func testDemoHourlyAndDailyTotalsAgree() {
        let now = calendar.date(from: DateComponents(year: 2026, month: 10, day: 24, hour: 14))!
        let data = DemoData.make(now: now, calendar: calendar)
        XCTAssertEqual(data.steps.count, 400)
        XCTAssertEqual(data.hourly.reduce(0) { $0 + $1.value }, data.steps.last!.value, accuracy: 0.001)
        XCTAssertTrue(data.pulse.allSatisfy { $0.date <= now })
    }
    func testZeroBaselineHasNoPercentage() {
        XCTAssertNil(Analytics.change(current: 100, previous: 0))
        XCTAssertEqual(Analytics.change(current: 112, previous: 100), 12)
    }
    func testWeekUsesCalendarDaysAcrossDST() {
        let end = calendar.date(from: DateComponents(year: 2026, month: 10, day: 27, hour: 12))!
        let start = Period.week.start(ending: end, calendar: calendar)
        XCTAssertEqual(calendar.component(.day, from: start), 21)
        XCTAssertEqual(calendar.component(.hour, from: start), 0)
    }
}
