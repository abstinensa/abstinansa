import SwiftUI

struct BadgesCard: View {
    @EnvironmentObject var store: GameStore
    private let columns = [GridItem(.adaptive(minimum: 74), spacing: 10)]

    var body: some View {
        Card {
            Text("Trofeer")
                .font(.system(size: 24, weight: .regular, design: .serif))
            Text("Lås opp merker etter hvert som du når milepæler.")
                .font(.caption).foregroundColor(Theme.muted)

            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(Catalogue.badges) { badge in
                    let earned = store.earnedBadges.contains(badge.id)
                    VStack(spacing: 4) {
                        Text(badge.emoji).font(.system(size: 30))
                        Text(badge.name)
                            .font(.system(size: 10)).foregroundColor(Theme.muted)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .opacity(earned ? 1 : 0.32)
                    .grayscale(earned ? 0 : 1)
                }
            }
        }
    }
}

struct HistoryCard: View {
    @EnvironmentObject var store: GameStore

    var body: some View {
        if !store.entries.isEmpty {
            Card {
                Text("Logg")
                    .font(.system(size: 24, weight: .regular, design: .serif))
                ForEach(Array(store.entries.reversed().enumerated()), id: \.element.id) { idx, entry in
                    let reversed = store.entries.reversed().map { $0 }
                    let prev = idx + 1 < reversed.count ? reversed[idx + 1] : nil
                    HStack {
                        if let prev {
                            let diff = entry.weight - prev.weight
                            Text("⚖️ \(store.format(entry.weight)) kg")
                            Text("\(diff <= 0 ? "▼" : "▲") \(store.format(abs(diff))) kg")
                                .font(.caption)
                                .foregroundColor(diff <= 0 ? Theme.green : Theme.accent)
                        } else {
                            Text("⚖️ \(store.format(entry.weight)) kg")
                        }
                        Spacer()
                        Text(entry.date.formatted(.dateTime.day().month(.abbreviated).year()))
                            .font(.caption).foregroundColor(Theme.muted)
                    }
                    .font(.subheadline)
                    .padding(.vertical, 8)
                    Divider()
                }
            }
        }
    }
}
