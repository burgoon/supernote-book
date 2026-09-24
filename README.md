# Supernote Book

A Supernote plugin that shows every page of every notebook in the Note folder as
one continuous, chronological sequence. Tap a page to open that notebook there.

Supernote's own Notes UI requires going back to the folder to move between
notebooks. This removes that step.

## Views

- **Book** — all pages, oldest notebook first, one page per screen. Swipe or use
  the arrows. Opens at the notebook that was open when the plugin was launched.
- **Notebooks** — notebooks newest first; tap to jump the book there.
- **Starred** — pages marked with a five-star, across all notebooks.

## Install

1. Download `SupernoteBook.snplg` from the latest release (or build it) and copy
   it into the `MyStyle` folder on the device.
2. Settings → Apps → Plugins → Add Plugin.
3. Open any note and tap the Book button in the toolbar. Grant read access to
   the Note folder when asked.

Requires firmware with plugin support (Settings → Apps → Plugins is present).

## Behaviour

- Ordering: notebook creation time from the `YYYYMMDD_HHMMSS` file name Supernote
  assigns, then page order. Notebooks without that prefix sort first. Subfolders
  of the Note folder are included; the folder is shown with the notebook name.
- Rendering: pages are rendered to PNG on first view and cached in the plugin's
  private directory, keyed by the notebook file's MD5. Edited notebooks
  re-render; unchanged ones load from cache.
- Permissions: `plugin.permission.FILE:READ` only. Nothing is written outside
  the plugin's own directory. No network.
- Errors are shown in the plugin view rather than closing it; the page includes
  the failing call and which SDK functions are available.

## Build

Node 18+, JDK 19+, Android SDK with platform 35 and build-tools 35.0.0,
`ANDROID_HOME` set, `android/local.properties` with `sdk.dir`.

```sh
npm install
npm run build        # build/outputs/SupernoteBook.snplg
npm run typecheck
npm run lint
```

The plugin is JavaScript only (React Native 0.79.2 on `sn-plugin-lib`); the
build bundles it. No native compilation unless native modules are added.

`PluginConfig.json` carries the plugin ID; keep it stable across releases so the
device treats builds as updates of the same plugin.

Pushing a `v*` tag builds the package on GitHub Actions and attaches it to a
release. Bump `versionName`/`versionCode` in `PluginConfig.json` first.

## Notes on the SDK

Observed on device (firmware with plugin support, `sn-plugin-lib` 0.1.65):

- `PluginManager.registerPluginLifeListener` takes `{onMsg(type)}`, not the
  `onStart`/`onStop` shape shown in the docs. Type `2` is start.
- `FileUtils.listFiles` returns objects, not path strings.
- A JavaScript error in a release bundle closes the plugin view silently;
  wrap the root in an error boundary.

## License

MIT
