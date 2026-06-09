import SwiftUI

struct LevelAndQuestsCard: View {
    @EnvironmentObject var store: GameStore

    var body: some View {
        Card {
            // Level row
            HStack(spacing: 14) {
                let info = store.levelInfo
                Text("\(info.level)")
                    .font(.system(size: 24, weight: .regular, design: .serif))
                    .foregroundColor(.white)
                    .frame(width: 54, height: 54)
                    .background(
                        LinearGradient(colors: [Theme.gold, Theme.goldLight],
                                       startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                VStack(alignment: .leading, spacing: 6) {
                    Text("Nivå \(info.level) · \(store.levelTitle)")
                        .font(.system(size: 16, weight: .semibold))
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Theme.warm)
                            Capsule()
                                .fill(LinearGradient(colors: [Theme.goldLight, Theme.gold],
                                                     startPoint: .leading, endPoint: .trailing))
                                .frame(width: geo.size.width * CGFloat(info.into) / CGFloat(max(1, info.need)))
                        }
                    }
                    .frame(height: 10)
                    HStack {
                        Text("\(info.into) / \(info.need) XP")
                        Spacer()
                        Text("🔥 \(store.streak) dagers streak")
                    }
                    .font(.caption2).foregroundColor(Theme.muted)
                }
            }

            Text("Dagens oppdrag")
                .font(.system(size: 20, weight: .regular, design: .serif))
                .padding(.top, 4)
            Text("Hak av når du er ferdig. Hvert oppdrag gir XP og nullstilles hver dag.")
                .font(.caption).foregroundColor(Theme.muted)

            ForEach(Catalogue.quests) { quest in
                QuestRow(quest: quest, done: store.isQuestDone(quest.id)) {
                    store.toggleQuest(quest)
                }
            }
        }
    }
}

private struct QuestRow: View {
    let quest: Quest
    let done: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Text(quest.icon).font(.system(size: 24)).frame(width: 38)
                VStack(alignment: .leading, spacing: 2) {
                    Text(quest.title).font(.system(size: 15, weight: .medium))
                        .foregroundColor(Theme.ink)
                    Text(quest.detail).font(.caption2).foregroundColor(Theme.muted)
                }
                Spacer()
                Text("+\(quest.xp) XP")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Theme.gold)
                    .padding(.vertical, 4).padding(.horizontal, 10)
                    .background(Color.white)
                    .clipShape(Capsule())
                ZStack {
                    Circle()
                        .strokeBorder(done ? Theme.green : Theme.warm, lineWidth: 2)
                        .background(Circle().fill(done ? Theme.green : .clear))
                        .frame(width: 26, height: 26)
                    if done {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
            }
            .padding(14)
            .background(
                done
                ? AnyView(LinearGradient(colors: [Theme.green.opacity(0.14), Theme.greenLight.opacity(0.10)],
                                         startPoint: .leading, endPoint: .trailing))
                : AnyView(Theme.cream)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(done ? Theme.greenLight : .clear, lineWidth: 1.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
