# Mobile UI Refactor — full method

Exhaustive "how" behind `refactor-ui-mobile`. SKILL.md gives the 6-step spine;
this file is the per-platform rule set.

## 0. Detect platform & framework
| Files / markers | Platform | Framework | Convention set |
|---|---|---|---|
| `*.swift` + `import SwiftUI` | iOS | SwiftUI | Apple HIG |
| `*.swift`/`*.m` + `UIViewController` | iOS | UIKit | Apple HIG |
| `*.kt` + `androidx.compose` | Android | Jetpack Compose | Material 3 |
| `*.kt`/`*.xml` layouts | Android | Views | Material |
| `App.tsx` + `react-native` | Both | React Native | HIG on iOS, Material on Android |
| `pubspec.yaml` + `flutter` | Both | Flutter | Cupertino on iOS, Material on Android |

If cross-platform (RN/Flutter), apply **each** platform's conventions per-OS at
runtime (`Platform.OS` / `Platform.isIOS` / `defaultTargetPlatform`).

## 1. Touch targets
- **iOS minimum: 44×44 pt.** **Android minimum: 48×48 dp.** (Material recommends 48dp;
  WCAG 2.5.5 AAA wants 44 CSS px — use the larger, 48, when serving both.)
- Adjacent targets need spacing (Material: ≥8dp gap) so thumbs don't hit the wrong one.
- Enlarge the **hit area**, not necessarily the visual:
  - SwiftUI: `.frame(minWidth:44,minHeight:44)` + `.contentShape(Rectangle())`.
  - Compose: `Modifier.sizeIn(minWidth=48.dp,minHeight=48.dp)` / `minimumInteractiveComponentSize()`.
  - RN: `hitSlop={{top:8,bottom:8,left:8,right:8}}` and/or padded `Pressable`.
  - Flutter: wrap in `SizedBox`/`Padding`; `MaterialTapTargetSize.padded` (default).
- Icon-only buttons are the usual offender: a 20pt glyph must live inside a 44/48 target.

## 2. Safe areas, insets & keyboard
Hardware steals the edges: status bar, notch / Dynamic Island (top), home indicator
(bottom), rounded corners, and the soft keyboard.
- **SwiftUI:** content respects safe area by default; use `.ignoresSafeArea()` only for
  backgrounds. Read `GeometryReader`/`safeAreaInsets` when you need the numbers. Use
  `.safeAreaInset(edge:)` for pinned bars. Keyboard: `.scrollDismissesKeyboard`, avoid
  content under it with a `ScrollView`.
- **UIKit:** constrain to `view.safeAreaLayoutGuide`; observe keyboard notifications or
  use `keyboardLayoutGuide`.
- **Compose:** `Modifier.windowInsetsPadding(WindowInsets.safeDrawing)`;
  `WindowInsets.ime` (with `imePadding()`) for the keyboard; `enableEdgeToEdge()` set up correctly.
- **React Native:** `react-native-safe-area-context` (`SafeAreaView` / `useSafeAreaInsets`);
  `KeyboardAvoidingView` (`behavior="padding"` iOS, `"height"` Android).
- **Flutter:** `SafeArea` widget; `MediaQuery.viewInsets.bottom` for the keyboard;
  `resizeToAvoidBottomInset`.
Rule: **no interactive or essential content under a hardware inset or the keyboard.**

## 3. Navigation patterns (native, not ported)
| Need | iOS (HIG) | Android (Material) |
|---|---|---|
| Top-level sections | Tab bar (bottom, ≤5) | Bottom navigation bar (3–5) / nav rail on tablets |
| Drill-in | Navigation stack, large title collapses on scroll | Top app bar + back, up affordance |
| Back | Edge-swipe from left + nav-bar back button | System/gesture back + up button |
| Many destinations | Tab bar + "More", or a list | Navigation drawer |
| Modal task | Sheet (`.sheet`, detents) | Bottom sheet / full-screen dialog |
Do **not** put a desktop sidebar on a phone; do **not** hide the Android system-back
behavior. Preserve destinations — change only the pattern used to reach them.

## 4. Scalable type & density
- **iOS Dynamic Type:** use text styles (`.font(.body)`, `.headline`…) not fixed sizes;
  support up to the accessibility sizes; `.minimumScaleFactor` / allow wrapping, never truncate essential text.
- **Android:** size text in `sp` (respects font scale); test at 200% font scale;
  Compose `MaterialTheme.typography`.
- **RN:** `allowFontScaling` (default true); `PixelRatio.getFontScale()`; avoid fixed heights that clip scaled text.
- **Flutter:** rely on `Theme.of(context).textTheme`; `MediaQuery.textScaler`; avoid `TextOverflow.clip` on key content.
- Keep spacing/type on the token scale from refactor-ui-tokens; design for one-handed reach
  (primary actions in the bottom/thumb zone).

## 5. Platform polish
- Motion/easing: iOS spring/`.smooth`; Material motion (`emphasized` easing).
- Controls: Cupertino (`Switch`, `Slider`, `.buttonStyle(.bordered)`) on iOS; Material
  components on Android — don't cross them unless brand-unified (ask first).
- Haptics where idiomatic (selection/impact on iOS; `HapticFeedback` on Android).
- Lists: swipe actions, pull-to-refresh, correct row separators and chevrons.
- Loading/empty/error states sized for the safe area.

## Guardrail recap
Presentation only — copy, behavior, data, and navigation destinations preserved.
Enlarge hit areas, not just glyphs. Respect insets on notched + gesture-nav devices.
Native nav per platform. Text scales. Pull values from tokens, not literals.
Confirm before unifying platform looks.
