import SwiftUI
import Charts

/// Plan line (1.4 kg/week) vs. actual weigh-ins, using Swift Charts (iOS 16+).
struct ProgressChartCard: View {
    @EnvironmentObject var store: GameStore

    private struct Point: Identifiable {
        let id = UUID()
        let day: Int
        let weight: Double
        let kind: String
    }

    private var planPoints: [Point] {
        let total = store.weeks * 7
        return [
            Point(day: 0, weight: store.start, kind: "Plan"),
            Point(day: total, weight: store.goal, kind: "Plan"),
        ]
    }

    private var actualPoints: [Point] {
        store.entries.map { e in
            let day = Calendar.current.dateComponents([.day], from: store.startDate, to: e.date).day ?? 0
            return Point(day: max(0, day), weight: e.weight, kind: "Du")
        }
    }

    var body: some View {
        Card {
            Text("Kurven din")
                .font(.system(size: 24, weight: .regular, design: .serif))
            Text("Grønn linje = planen (1,4 kg/uke). Oransje = dine veiinger.")
                .font(.caption).foregroundColor(Theme.muted)

            Chart {
                ForEach(planPoints) { p in
                    LineMark(x: .value("Dag", p.day), y: .value("Kg", p.weight))
                        .foregroundStyle(Theme.green)
                        .lineStyle(StrokeStyle(lineWidth: 2.5, dash: [6, 5]))
                }
                ForEach(actualPoints) { p in
                    LineMark(x: .value("Dag", p.day), y: .value("Kg", p.weight))
                        .foregroundStyle(Theme.accent)
                    PointMark(x: .value("Dag", p.day), y: .value("Kg", p.weight))
                        .foregroundStyle(Theme.accent)
                }
                RuleMark(y: .value("Mål", store.goal))
                    .foregroundStyle(Theme.green.opacity(0.5))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    .annotation(position: .top, alignment: .trailing) {
                        Text("🎯 \(store.format(store.goal)) kg")
                            .font(.caption2).foregroundColor(Theme.green)
                    }
            }
            .chartXAxisLabel("Dag")
            .chartYScale(domain: (store.goal - 1)...(store.start + 1))
            .frame(height: 200)
        }
    }
}
