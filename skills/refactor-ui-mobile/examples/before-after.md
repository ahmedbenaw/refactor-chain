# Worked examples — mobile UI refactors

## Example 1 — SwiftUI screen: tiny targets + notch/home-indicator bleed

### Before
Icon buttons are 24pt (miss-taps galore), the header hides under the notch, the CTA
sits under the home indicator, and font sizes are fixed (no Dynamic Type).

```swift
struct ProfileView: View {
  var body: some View {
    VStack {
      HStack {
        Image(systemName: "chevron.left").frame(width: 24, height: 24)   // 24pt — too small
        Spacer()
        Image(systemName: "ellipsis").frame(width: 24, height: 24)
      }
      .padding(.top, 0)                                                   // under the notch
      Text("Jane Doe").font(.system(size: 28))                           // fixed size
      Text("Product Designer").font(.system(size: 15)).foregroundColor(.gray)
      Spacer()
      Button("Edit Profile") { edit() }
        .frame(maxWidth: .infinity, minHeight: 30)                        // 30pt tall + no bottom inset
    }
    .padding(.horizontal, 16)
    .ignoresSafeArea()                                                    // wrong: kills all insets
  }
}
```

### After
```swift
struct ProfileView: View {
  var body: some View {
    VStack(spacing: Theme.Space.s4) {
      HStack {
        Button(action: back) { Image(systemName: "chevron.left") }
          .frame(minWidth: 44, minHeight: 44)            // ≥44pt hit area
          .contentShape(Rectangle())
        Spacer()
        Button(action: more) { Image(systemName: "ellipsis") }
          .frame(minWidth: 44, minHeight: 44)
          .contentShape(Rectangle())
      }
      Text("Jane Doe").font(.title)                       // Dynamic Type
      Text("Product Designer").font(.subheadline).foregroundStyle(.secondary)
      Spacer()
      Button("Edit Profile") { edit() }
        .frame(maxWidth: .infinity, minHeight: 44)        // ≥44pt
        .buttonStyle(.borderedProminent)
    }
    .padding(.horizontal, Theme.Space.s4)
    .safeAreaInset(edge: .bottom) { Color.clear.frame(height: 0) }  // respects home indicator
    // NOTE: no blanket .ignoresSafeArea(); background can ignore it separately
  }
}
```
Same content and actions (`back`, `more`, `edit`) — only targets, insets, and type scaling changed.

---

## Example 2 — Jetpack Compose: ported desktop drawer → Material bottom nav + insets

### Before
A left drawer for top-level tabs (desktop habit), 36dp icon buttons, and content that
runs under the status bar and IME keyboard.

```kotlin
@Composable fun Home() {
  Row {                                   // permanent side "drawer" — wrong on a phone
    NavRailDesktop()
    Column(Modifier.fillMaxSize()) {      // no window insets → under status bar
      IconButton(onClick = ::search, Modifier.size(36.dp)) { Icon(Icons.Default.Search, null) }  // 36dp
      LazyColumn { items(feed) { PostRow(it) } }
      TextField(query, ::setQuery)        // covered by keyboard
    }
  }
}
```

### After
```kotlin
@Composable fun Home() {
  Scaffold(
    bottomBar = {                          // Material bottom navigation (3–5 destinations)
      NavigationBar {
        destinations.forEach { d -> NavigationBarItem(selected = d.selected, onClick = d.onSelect,
          icon = { Icon(d.icon, d.label) }, label = { Text(d.label) }) }
      }
    }
  ) { pad ->
    Column(
      Modifier.fillMaxSize().padding(pad)
        .windowInsetsPadding(WindowInsets.safeDrawing)   // status bar + nav bar + cutout
        .imePadding()                                    // lift above keyboard
    ) {
      IconButton(onClick = ::search, Modifier.minimumInteractiveComponentSize()) {  // ≥48dp
        Icon(Icons.Default.Search, contentDescription = "Search")
      }
      LazyColumn(Modifier.weight(1f)) { items(feed) { PostRow(it) } }
      TextField(query, ::setQuery, Modifier.fillMaxWidth())
    }
  }
}
```
Destinations preserved; the *pattern* is now native Android (bottom nav + system-back),
targets are ≥48dp, and insets keep content clear of hardware and the keyboard.

---

## Why these are better
- **Targets meet the platform minimum** (44pt/48dp) so real thumbs hit them.
- **Nothing hides under the notch, home indicator, status bar, or keyboard.**
- **Navigation matches what users of that OS already know** — no desktop metaphors on a phone.
- **Text scales** with the user's accessibility text-size setting.
- **Values come from tokens** (`Theme.Space.s4`), keeping the whole chain consistent.
