# Vektreisen — native iOS app (SwiftUI)

A native SwiftUI version of the Vektreisen weight-loss game (the same game that
lives as a web app at `abstinensa.no/weight`). Goal preset: **65 → 51 kg over 10
weeks** (editable in-app).

## ⚠️ Read this first: you need a Mac

There is **no way to build or run a native iOS app without macOS + Xcode** — this
is an Apple restriction, not a choice. To install the finished app on your own
iPhone you also need a free **Apple ID** (7-day signing) or a paid **Apple
Developer account** ($99/yr, required for the App Store and longer signing).

**If you don't have a Mac yet, options are:**
1. **Use the web app today** — `abstinensa.no/weight` → in Safari: *Share → Add to
   Home Screen*. It runs fullscreen and offline, like an app. (Already shipped.)
2. **Borrow / rent a Mac later** — a friend's Mac, or a cloud Mac
   (e.g. MacInCloud, MacStadium, AWS EC2 Mac) for a few hours is enough to build.
3. Come back to this folder when you have Mac access — everything is ready.

## What's here

```
ios/
├── project.yml                 # XcodeGen spec → generates the .xcodeproj
└── Vektreisen/
    ├── VektreisenApp.swift     # @main app entry
    ├── Theme.swift             # colors + Card component
    ├── Models.swift            # WeightEntry, Quest, Badge, catalogues
    ├── GameStore.swift         # all game logic + persistence (UserDefaults)
    ├── ContentView.swift       # main screen + header + hero stats
    ├── Info.plist
    ├── Assets.xcassets/        # app icon + accent color
    └── Views/
        ├── MountainCard.swift          # the climb visual
        ├── LevelAndQuestsCard.swift    # XP/level + daily quests
        ├── LogWeightCard.swift         # weigh-in entry
        ├── ProgressChartCard.swift     # Swift Charts plan-vs-actual
        ├── WeeklyMilestonesCard.swift  # 10 weekly targets
        ├── BadgesCard.swift            # trophies + history log
        └── SettingsCard.swift          # edit goals / reset
```

Requires **iOS 16+** (uses Swift Charts). No third-party dependencies.

## How to open & run it (on a Mac)

### Option A — XcodeGen (recommended, reproducible)
```bash
brew install xcodegen          # one-time
cd ios
xcodegen generate             # creates Vektreisen.xcodeproj
open Vektreisen.xcodeproj
```
Then in Xcode: pick a Simulator (or your iPhone) and press **▶ Run**.
To run on a physical iPhone, set your team under
*Signing & Capabilities* (and `DEVELOPMENT_TEAM` in `project.yml`).

### Option B — no XcodeGen (manual project)
1. Xcode → **File → New → Project → iOS → App**
   (Interface: *SwiftUI*, Language: *Swift*, name: *Vektreisen*).
2. Delete the auto-generated `ContentView.swift` and the `App` file.
3. Drag **everything inside `ios/Vektreisen/`** into the project navigator
   (check *Copy items if needed* and *Create groups*).
4. Set deployment target to iOS 16.0 and press **▶ Run**.

## Notes
- All data is stored locally on-device via `UserDefaults` (Codable JSON) — nothing
  is uploaded anywhere, same privacy model as the web version.
- A natural next step on real hardware would be **HealthKit** integration to pull
  weight automatically — easy to add later in `GameStore`.
