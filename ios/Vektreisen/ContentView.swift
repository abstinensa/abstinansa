import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: GameStore

    var body: some View {
        ZStack(alignment: .bottom) {
            Theme.cream.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 18) {
                    HeaderView()
                    HeroStatsView()
                    MountainCard()
                    LevelAndQuestsCard()
                    LogWeightCard()
                    ProgressChartCard()
                    WeeklyMilestonesCard()
                    BadgesCard()
                    HistoryCard()
                    SettingsCard()
                    Text("Laget med 💪 · alt lagres kun lokalt på enheten din · abstinensa.no")
                        .font(.caption2)
                        .foregroundColor(Theme.muted)
                        .multilineTextAlignment(.center)
                        .padding(.top, 8)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 40)
            }

            if let toast = store.toast {
                Text(toast)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.vertical, 14).padding(.horizontal, 22)
                    .background(Theme.ink)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .shadow(color: .black.opacity(0.3), radius: 18, y: 8)
                    .padding(.bottom, 28)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .onAppear { store.resetQuestsIfNewDay() }
    }
}

// MARK: - Header

struct HeaderView: View {
    var body: some View {
        VStack(spacing: 6) {
            Text("Vektreisen 🏔️")
                .font(.system(size: 34, weight: .bold, design: .serif))
            Text("65 → 51 kg")
                .font(.system(size: 30, weight: .regular, design: .serif))
                .italic()
                .foregroundColor(Theme.accent)
            Text("Gjør reisen til et spill. Klatre fjellet, én uke om gangen.")
                .font(.subheadline)
                .foregroundColor(Theme.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 28)
    }
}

// MARK: - Hero stats

struct HeroStatsView: View {
    @EnvironmentObject var store: GameStore
    var body: some View {
        HStack(spacing: 12) {
            stat(store.format(store.current), "Vekt nå")
            stat(store.format(store.lost), "Tapt (kg)")
            stat(store.format(store.toGo), "Igjen (kg)")
            stat("\(store.daysLeft)", "Dager igjen")
        }
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 6) {
            Text(value)
                .font(.system(size: 26, weight: .regular, design: .serif))
                .foregroundColor(Theme.accent)
                .minimumScaleFactor(0.6).lineLimit(1)
            Text(label.uppercased())
                .font(.system(size: 9, weight: .semibold))
                .tracking(0.8)
                .foregroundColor(Theme.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16).padding(.horizontal, 6)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: Theme.ink.opacity(0.08), radius: 12, y: 6)
    }
}

#Preview {
    ContentView().environmentObject(GameStore())
}
