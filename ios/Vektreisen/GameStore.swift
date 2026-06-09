import Foundation
import SwiftUI

/// The single source of truth for the game. Persists to UserDefaults as JSON,
/// mirroring the localStorage approach of the web version.
final class GameStore: ObservableObject {

    // Persisted settings / progress
    @Published var start: Double = 65
    @Published var goal: Double = 51
    @Published var weeks: Int = 10
    @Published var startDate: Date = Calendar.current.startOfDay(for: Date())
    @Published var entries: [WeightEntry] = []
    @Published var xp: Int = 0
    @Published var streak: Int = 0
    @Published var completedQuests: Set<String> = []
    @Published var earnedBadges: Set<String> = []

    // Internal bookkeeping
    @Published var lastQuestDay: String = ""   // ISO yyyy-MM-dd
    @Published var lastLogDay: String = ""

    /// Transient toast message for the UI.
    @Published var toast: String?

    private let key = "vektreisen.state"
    private let iso: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    init() {
        load()
        resetQuestsIfNewDay()
        refreshBadges()
    }

    // MARK: - Derived values

    var current: Double { entries.last?.weight ?? start }
    var lost: Double { max(0, start - current) }
    var toGo: Double { max(0, current - goal) }

    var totalToLose: Double { max(0.001, start - goal) }
    var progress: Double { min(1, max(0, lost / totalToLose)) }   // 0...1

    var daysLeft: Int {
        let end = Calendar.current.date(byAdding: .day, value: weeks * 7, to: startDate) ?? Date()
        return max(0, Calendar.current.dateComponents([.day], from: Date(), to: end).day ?? 0)
    }

    var levelInfo: LevelInfo {
        var level = 1, need = 100, remaining = xp
        while remaining >= need {
            remaining -= need
            level += 1
            need = Int((Double(need) * 1.15).rounded())
        }
        return LevelInfo(level: level, into: remaining, need: need)
    }

    var levelTitle: String {
        let l = levelInfo.level
        return Catalogue.levelTitles[min(l - 1, Catalogue.levelTitles.count - 1)]
    }

    /// Target weights for each of the `weeks` milestones.
    var weekTargets: [Double] {
        let step = (start - goal) / Double(weeks)
        return (1...max(1, weeks)).map { start - step * Double($0) }
    }

    /// Index (0-based) of the current week relative to startDate.
    var currentWeekIndex: Int {
        let days = Calendar.current.dateComponents([.day], from: startDate, to: Date()).day ?? 0
        return max(0, days / 7)
    }

    /// True if the milestone for week `i` (0-based) has been hit.
    func weekHit(_ i: Int) -> Bool {
        guard i < weekTargets.count else { return false }
        let weekEnd = Calendar.current.date(byAdding: .day, value: (i + 1) * 7, to: startDate) ?? Date()
        let within = entries.filter { $0.date <= weekEnd }
        guard let best = within.map(\.weight).min() else { return false }
        return best <= weekTargets[i] + 0.05
    }

    // MARK: - Quests

    func resetQuestsIfNewDay() {
        let today = iso.string(from: Date())
        if lastQuestDay != today {
            lastQuestDay = today
            completedQuests = []
            save()
        }
    }

    func isQuestDone(_ id: String) -> Bool { completedQuests.contains(id) }

    func toggleQuest(_ q: Quest) {
        resetQuestsIfNewDay()
        if completedQuests.contains(q.id) {
            completedQuests.remove(q.id)
            xp = max(0, xp - q.xp)
        } else {
            completedQuests.insert(q.id)
            xp += q.xp
            showToast("+\(q.xp) XP · fullført ✅")
        }
        save(); refreshBadges()
    }

    // MARK: - Logging weight

    func logWeight(_ weight: Double, on date: Date) {
        let day = Calendar.current.startOfDay(for: date)
        let previous = current

        entries.removeAll { Calendar.current.isDate($0.date, inSameDayAs: day) }
        entries.append(WeightEntry(date: day, weight: weight))
        entries.sort { $0.date < $1.date }

        updateStreak(for: day)

        var gained = 10
        if weight < previous { gained += 20 }
        xp += gained
        completedQuests.insert("weigh")   // auto-complete the weigh-in quest

        save(); refreshBadges()

        if weight < previous {
            showToast("Ned \(format(previous - weight)) kg! 🎉 +\(gained) XP")
        } else {
            showToast("Logget \(format(weight)) kg · +\(gained) XP")
        }
    }

    private func updateStreak(for day: Date) {
        let dayStr = iso.string(from: day)
        if lastLogDay == dayStr { return }
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: day)!
        if lastLogDay == iso.string(from: yesterday) {
            streak += 1
        } else {
            streak = 1
        }
        lastLogDay = dayStr
    }

    // MARK: - Badges

    func refreshBadges() {
        var newlyEarned: [Badge] = []
        for badge in Catalogue.badges where !earnedBadges.contains(badge.id) && badge.test(self) {
            earnedBadges.insert(badge.id)
            newlyEarned.append(badge)
        }
        if let first = newlyEarned.first {
            showToast("Nytt trofé! \(first.emoji) \(first.name)")
        }
        if !newlyEarned.isEmpty { save() }
    }

    // MARK: - Settings

    func saveSettings(start: Double, goal: Double, weeks: Int) -> Bool {
        guard goal < start, weeks >= 1 else {
            showToast("Sjekk verdiene (mål må være lavere enn start) 🙂")
            return false
        }
        self.start = start; self.goal = goal; self.weeks = weeks
        save(); refreshBadges()
        showToast("Innstillinger lagret ✅")
        return true
    }

    func resetAll() {
        start = 65; goal = 51; weeks = 10
        startDate = Calendar.current.startOfDay(for: Date())
        entries = []; xp = 0; streak = 0
        completedQuests = []; earnedBadges = []
        lastQuestDay = ""; lastLogDay = ""
        resetQuestsIfNewDay()
        save()
        showToast("Nullstilt – ny start! 🌱")
    }

    // MARK: - Toast

    func showToast(_ message: String) {
        withAnimation { toast = message }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) { [weak self] in
            withAnimation { if self?.toast == message { self?.toast = nil } }
        }
    }

    // MARK: - Formatting

    /// Norwegian decimal formatting (comma), one decimal place.
    func format(_ n: Double) -> String {
        let rounded = (n * 10).rounded() / 10
        return String(format: "%.1f", rounded).replacingOccurrences(of: ".", with: ",")
    }

    // MARK: - Persistence

    private struct Persisted: Codable {
        var start: Double; var goal: Double; var weeks: Int
        var startDate: Date; var entries: [WeightEntry]
        var xp: Int; var streak: Int
        var completedQuests: [String]; var earnedBadges: [String]
        var lastQuestDay: String; var lastLogDay: String
    }

    func save() {
        let p = Persisted(
            start: start, goal: goal, weeks: weeks, startDate: startDate,
            entries: entries, xp: xp, streak: streak,
            completedQuests: Array(completedQuests), earnedBadges: Array(earnedBadges),
            lastQuestDay: lastQuestDay, lastLogDay: lastLogDay
        )
        if let data = try? JSONEncoder().encode(p) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    func load() {
        guard let data = UserDefaults.standard.data(forKey: key),
              let p = try? JSONDecoder().decode(Persisted.self, from: data) else { return }
        start = p.start; goal = p.goal; weeks = p.weeks; startDate = p.startDate
        entries = p.entries; xp = p.xp; streak = p.streak
        completedQuests = Set(p.completedQuests); earnedBadges = Set(p.earnedBadges)
        lastQuestDay = p.lastQuestDay; lastLogDay = p.lastLogDay
    }
}
