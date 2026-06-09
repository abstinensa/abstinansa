import SwiftUI

struct LogWeightCard: View {
    @EnvironmentObject var store: GameStore
    @State private var weightText = ""
    @State private var date = Date()
    @FocusState private var focused: Bool

    var body: some View {
        Card {
            Text("Logg vekten din")
                .font(.system(size: 24, weight: .regular, design: .serif))
            Text("Vei deg helst på samme tid (morgen, før frokost) for de mest stabile tallene.")
                .font(.caption).foregroundColor(Theme.muted)

            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Vekt i dag (kg)")
                        .font(.caption).fontWeight(.semibold).foregroundColor(Theme.slate)
                    TextField("f.eks. 64,3", text: $weightText)
                        .keyboardType(.decimalPad)
                        .focused($focused)
                        .padding(12)
                        .background(Theme.cream)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("Dato")
                        .font(.caption).fontWeight(.semibold).foregroundColor(Theme.slate)
                    DatePicker("", selection: $date, displayedComponents: .date)
                        .labelsHidden()
                        .datePickerStyle(.compact)
                }
            }

            Button(action: log) {
                Text("Logg vekt ⚖️")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            Text(feedback)
                .font(.caption).foregroundColor(Theme.muted)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.cream)
                .overlay(Rectangle().fill(Theme.goldLight).frame(width: 3), alignment: .leading)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private var feedback: String {
        guard let last = store.entries.last else {
            return "Logg din første veiing for å sette i gang reisen."
        }
        if last.weight <= store.goal { return "Du har nådd målet ditt! 👑" }
        return "Sist logget: \(store.format(last.weight)) kg. Bare \(store.format(store.toGo)) kg igjen til \(store.format(store.goal)) kg."
    }

    private func log() {
        let normalized = weightText.replacingOccurrences(of: ",", with: ".")
        guard let w = Double(normalized), w > 0 else {
            store.showToast("Skriv inn en gyldig vekt 🙂")
            return
        }
        store.logWeight(w, on: date)
        weightText = ""
        focused = false
    }
}
