import SwiftUI

struct SettingsCard: View {
    @EnvironmentObject var store: GameStore
    @State private var startText = ""
    @State private var goalText = ""
    @State private var weeksText = ""
    @State private var showResetAlert = false

    var body: some View {
        Card {
            Text("Innstillinger")
                .font(.system(size: 24, weight: .regular, design: .serif))
            Text("Endre målene dine her hvis du vil justere reisen.")
                .font(.caption).foregroundColor(Theme.muted)

            HStack(spacing: 12) {
                field("Startvekt", text: $startText)
                field("Målvekt", text: $goalText)
                field("Uker", text: $weeksText)
            }

            HStack(spacing: 12) {
                ghostButton("Lagre innstillinger") {
                    let s = Double(startText.replacingOccurrences(of: ",", with: ".")) ?? store.start
                    let g = Double(goalText.replacingOccurrences(of: ",", with: ".")) ?? store.goal
                    let w = Int(weeksText) ?? store.weeks
                    _ = store.saveSettings(start: s, goal: g, weeks: w)
                }
                ghostButton("Nullstill alt") { showResetAlert = true }
            }

            Text("💛 Vær snill med deg selv. 14 kg på 10 uker er et raskt tempo (ca. 1,4 kg/uke). De fleste helsefaglige råd anbefaler 0,5–1 kg per uke for et varig resultat. Gi deg gjerne litt lengre tid – juster ukene over. Snakk med fastlege/ernæringsfysiolog ved store endringer.")
                .font(.caption).foregroundColor(Theme.muted)
                .padding(14)
                .background(Theme.cream)
                .overlay(Rectangle().fill(Theme.goldLight).frame(width: 3), alignment: .leading)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .onAppear {
            startText = String(format: "%g", store.start)
            goalText = String(format: "%g", store.goal)
            weeksText = "\(store.weeks)"
        }
        .alert("Nullstille all fremgang?", isPresented: $showResetAlert) {
            Button("Avbryt", role: .cancel) {}
            Button("Nullstill", role: .destructive) {
                store.resetAll()
                startText = "65"; goalText = "51"; weeksText = "10"
            }
        } message: {
            Text("Dette kan ikke angres.")
        }
    }

    private func field(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.caption).fontWeight(.semibold).foregroundColor(Theme.slate)
            TextField("", text: text)
                .keyboardType(.decimalPad)
                .padding(12)
                .background(Theme.cream)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private func ghostButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(Theme.accent)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Theme.accentLight, lineWidth: 1.5)
                )
        }
    }
}
