import SwiftUI

struct WeeklyMilestonesCard: View {
    @EnvironmentObject var store: GameStore

    private let columns = [GridItem(.adaptive(minimum: 110), spacing: 10)]

    var body: some View {
        Card {
            Text("Ukesmål")
                .font(.system(size: 24, weight: .regular, design: .serif))
            Text("\(store.weeks) etapper til toppen. Klarer du delmålet får uka et grønt segl ✅.")
                .font(.caption).foregroundColor(Theme.muted)

            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(Array(store.weekTargets.enumerated()), id: \.offset) { i, target in
                    weekCell(index: i, target: target)
                }
            }
        }
    }

    private func weekCell(index i: Int, target: Double) -> some View {
        let hit = store.weekHit(i)
        let isCurrent = i == store.currentWeekIndex
        let date = Calendar.current.date(byAdding: .day, value: (i + 1) * 7, to: store.startDate) ?? Date()

        return VStack(spacing: 2) {
            Text("UKE \(i + 1)")
                .font(.system(size: 10, weight: .semibold)).tracking(0.6)
                .foregroundColor(Theme.muted)
            Text(store.format(target))
                .font(.system(size: 22, weight: .regular, design: .serif))
            Text(date.formatted(.dateTime.day().month(.abbreviated)))
                .font(.caption2).foregroundColor(Theme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(
            hit
            ? AnyView(LinearGradient(colors: [Theme.green.opacity(0.16), Theme.greenLight.opacity(0.08)],
                                     startPoint: .topLeading, endPoint: .bottomTrailing))
            : AnyView(Theme.cream)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(isCurrent ? Theme.accentLight : (hit ? Theme.greenLight : .clear),
                              lineWidth: isCurrent ? 2 : 1.5)
        )
        .overlay(alignment: .topTrailing) {
            if hit { Text("✅").font(.caption).padding(6) }
        }
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}
