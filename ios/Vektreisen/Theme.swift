import SwiftUI

/// Color palette mirroring the abstinensa.no web design tokens.
enum Theme {
    static let ink         = Color(hex: 0x1A1A2E)
    static let cream       = Color(hex: 0xF8F6F1)
    static let warm        = Color(hex: 0xE8E4DC)
    static let accent      = Color(hex: 0xC4593E)
    static let accentLight = Color(hex: 0xE8967F)
    static let muted       = Color(hex: 0x6B6B7B)
    static let slate       = Color(hex: 0x3D3D50)
    static let gold        = Color(hex: 0xB8944F)
    static let goldLight   = Color(hex: 0xD4BB7C)
    static let green       = Color(hex: 0x4F9D69)
    static let greenLight  = Color(hex: 0x7FC596)
    static let sky         = Color(hex: 0xCFE6EF)
}

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue:  Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}

/// A reusable rounded card matching the web cards.
struct Card<Content: View>: View {
    let content: Content
    init(@ViewBuilder _ content: () -> Content) { self.content = content() }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(22)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .shadow(color: Theme.ink.opacity(0.10), radius: 18, x: 0, y: 10)
    }
}
