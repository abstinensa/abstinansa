import Foundation

/// A single weigh-in.
struct WeightEntry: Codable, Identifiable, Equatable {
    var id = UUID()
    var date: Date
    var weight: Double
}

/// A daily quest definition (static catalogue).
struct Quest: Identifiable {
    let id: String
    let icon: String
    let title: String
    let detail: String
    let xp: Int
}

/// A trophy/badge definition. `test` evaluates against the current store.
struct Badge: Identifiable {
    let id: String
    let emoji: String
    let name: String
    let test: (GameStore) -> Bool
}

/// Resolved level information from a raw XP total.
struct LevelInfo {
    let level: Int
    let into: Int    // XP earned into the current level
    let need: Int    // XP required to finish the current level
}

enum Catalogue {
    static let quests: [Quest] = [
        Quest(id: "water",   icon: "💧", title: "Drikk 2 liter vann",            detail: "Hydrering demper sultfølelse",         xp: 15),
        Quest(id: "steps",   icon: "👟", title: "10 000 skritt / 30 min gåtur",  detail: "Bevegelse forbrenner og letter humøret", xp: 25),
        Quest(id: "veggies", icon: "🥗", title: "Grønnsaker til 2 måltider",     detail: "Mett og næringsrikt",                  xp: 15),
        Quest(id: "nosugar", icon: "🍫", title: "Hopp over snacks/sukker",       detail: "Den store nøkkelen",                   xp: 20),
        Quest(id: "sleep",   icon: "😴", title: "7+ timer søvn",                 detail: "Søvn styrer appetitthormonene",        xp: 15),
        Quest(id: "weigh",   icon: "⚖️", title: "Vei og logg deg",               detail: "Det du måler, mestrer du",             xp: 10),
    ]

    static let levelTitles = [
        "Nybegynner", "På vei", "Vandrer", "Klatrer", "Utfordrer",
        "Fjellgeit", "Ekspert", "Mester", "Legende", "Toppveteran"
    ]

    static let badges: [Badge] = [
        Badge(id: "first",   emoji: "🌱", name: "Første steg")    { !$0.entries.isEmpty },
        Badge(id: "kg1",     emoji: "⭐", name: "1 kg ned")       { $0.lost >= 1 },
        Badge(id: "kg3",     emoji: "🔥", name: "3 kg ned")       { $0.lost >= 3 },
        Badge(id: "kg5",     emoji: "💪", name: "5 kg ned")       { $0.lost >= 5 },
        Badge(id: "half",    emoji: "🏅", name: "Halvveis")       { $0.lost >= ($0.start - $0.goal) / 2 },
        Badge(id: "kg10",    emoji: "🚀", name: "10 kg ned")      { $0.lost >= 10 },
        Badge(id: "streak3", emoji: "📅", name: "3-dagers streak"){ $0.streak >= 3 },
        Badge(id: "streak7", emoji: "🗓️", name: "7-dagers streak"){ $0.streak >= 7 },
        Badge(id: "lvl5",    emoji: "🎖️", name: "Nivå 5")         { $0.levelInfo.level >= 5 },
        Badge(id: "goal",    emoji: "👑", name: "I mål!")          { $0.current <= $0.goal },
    ]
}
