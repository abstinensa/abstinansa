import SwiftUI

@main
struct VektreisenApp: App {
    @StateObject private var store = GameStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
