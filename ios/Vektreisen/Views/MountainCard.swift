import SwiftUI

/// The "Toppturen" climb visual: a climber moves from the valley to the summit
/// as progress increases.
struct MountainCard: View {
    @EnvironmentObject var store: GameStore

    private var progressMessage: String {
        let p = store.progress
        if store.current <= store.goal { return "Du er på toppen! 👑" }
        if p >= 0.75 { return "Nesten der! 🚀" }
        if p >= 0.50 { return "Halvveis – sterkt! 🔥" }
        if p >= 0.25 { return "Godt i gang! 🌟" }
        if p > 0     { return "Reisen har startet! 🌱" }
        return "La oss gå! 💪"
    }

    var body: some View {
        Card {
            Text("Toppturen")
                .font(.system(size: 24, weight: .regular, design: .serif))
            Text("Du går fra dalen (\(store.format(store.start)) kg) til toppen (\(store.format(store.goal)) kg).")
                .font(.caption).foregroundColor(Theme.muted)

            GeometryReader { geo in
                let w = geo.size.width
                let h = geo.size.height
                ZStack(alignment: .bottomLeading) {
                    LinearGradient(colors: [Theme.sky, Theme.cream],
                                   startPoint: .top, endPoint: .bottom)

                    MountainShape()
                        .fill(Color(hex: 0x9FB89A))

                    Text("🚩")
                        .font(.system(size: 26))
                        .position(x: w * 0.9, y: h * 0.16)

                    Text(store.current <= store.goal ? "🏆" : "🧗‍♀️")
                        .font(.system(size: 30))
                        .position(
                            x: w * (0.08 + store.progress * 0.82),
                            y: h * (0.9 - store.progress * 0.74)
                        )
                        .animation(.spring(response: 0.9, dampingFraction: 0.7), value: store.progress)
                }
            }
            .frame(height: 190)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.warm)
                    Capsule()
                        .fill(LinearGradient(colors: [Theme.greenLight, Theme.green],
                                             startPoint: .leading, endPoint: .trailing))
                        .frame(width: geo.size.width * store.progress)
                        .animation(.spring(response: 0.9, dampingFraction: 0.7), value: store.progress)
                }
            }
            .frame(height: 16)

            HStack {
                Text("\(Int(store.progress * 100))% fullført")
                Spacer()
                Text(progressMessage)
            }
            .font(.caption).foregroundColor(Theme.muted)
        }
    }
}

/// A simple layered mountain silhouette.
private struct MountainShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width, h = rect.height
        var p = Path()
        p.move(to: CGPoint(x: 0, y: h))
        p.addLine(to: CGPoint(x: w * 0.18, y: h * 0.55))
        p.addLine(to: CGPoint(x: w * 0.34, y: h * 0.72))
        p.addLine(to: CGPoint(x: w * 0.55, y: h * 0.28))
        p.addLine(to: CGPoint(x: w * 0.74, y: h * 0.6))
        p.addLine(to: CGPoint(x: w * 0.9,  y: h * 0.18))
        p.addLine(to: CGPoint(x: w, y: h * 0.4))
        p.addLine(to: CGPoint(x: w, y: h))
        p.closeSubpath()
        return p
    }
}
