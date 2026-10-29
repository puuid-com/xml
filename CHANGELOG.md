# Changelog

Every change bumps `version` in `package.json` and adds an entry here, newest first. The version shows in the editor's bottom bar and the site footer.

- **Major**: breaking changes to stored data, share links or file formats.
- **Minor**: new features and visible behavior changes.
- **Patch**: fixes, refactors, docs and tooling.

## [0.149.0] - 2026-10-28

### Added

- Automatically select a matching profile when opening or dropping a file, based on its structure and learned profile choices. ([4131a4d](https://github.com/puuid-com/xml/commit/4131a4de59d71cb836df66d3b675dd169b4e4826))
- Document the complete earlier Git history, grouped by date with links to every commit.

### Changed

- Restyle the changelog with compact release sections, date navigation and the editor’s neutral typography and colors.

## [0.148.0] - 2026-10-28

[Commit 432cfec](https://github.com/puuid-com/xml/commit/432cfec)

### Added

- Add a changelog page. Click the version in the bottom bar or footer to open it.

## [0.147.0] - 2026-10-28

[Commit 85bf204](https://github.com/puuid-com/xml/commit/85bf204)

### Added

- Show the app version in the editor's bottom bar and the site footer.
- Start versioning. The first version comes from the commit count (147); earlier work is documented below by commit date.

## [history-2026-10-28] - 2026-10-28

Reconstructed from Git history before versioning began. These are commit dates, not published releases.

### Changed

- Disable bottom bar actions that have nothing to do. ([9a2b2ed](https://github.com/puuid-com/xml/commit/9a2b2eddf8ca841e73087bfb85439430fabddbe2))
- Replace variables in place instead of a new file. ([6b4129d](https://github.com/puuid-com/xml/commit/6b4129dd8779679af010c05976e03d6eef6ec54a))
- Make every file content change undoable. ([88e3589](https://github.com/puuid-com/xml/commit/88e3589fc8a20b8e3d07a8ef14d056e223f2b11e))
- Size tabs to their names and float notices over the bar. ([617f3ad](https://github.com/puuid-com/xml/commit/617f3ad6571b037ae0158b92fdb43efe3ffa2403))
- Preselect the last-run command in the palette. ([be49086](https://github.com/puuid-com/xml/commit/be490869b3ebe14abdd389e857bbfaaf6eef883d))
- Move the notice slot to the top right. ([b3acbc4](https://github.com/puuid-com/xml/commit/b3acbc46011489d8d47c0f1ed1653601688d3a30))
- Give notices a fixed slot at the bottom right. ([729fa90](https://github.com/puuid-com/xml/commit/729fa90318f5f31b2321c899eeb6bc11aa7cacc5))
- Confirm variable replacement with a preview dialog. ([5714cde](https://github.com/puuid-com/xml/commit/5714cdeea060c6032256dac9437da31fedd1b2df))
- Swap the status sentence for labelled switches with icons. ([dd6066c](https://github.com/puuid-com/xml/commit/dd6066cb064778404e28b3cfd5e3742d12046719))
- Replace bottom icon bar with a readable status sentence. ([eab35af](https://github.com/puuid-com/xml/commit/eab35afc8ad0742c96456cbf491a57924111c087))
- Render pinned values like the file panel does. ([488dfaa](https://github.com/puuid-com/xml/commit/488dfaa609f8137c23e8f4e44975551b785de4e3))
- Use sets for the stray bracket lookups. ([dfd3dc5](https://github.com/puuid-com/xml/commit/dfd3dc518d49c69eada99b46d2b48feb63f9ab97))

### Fixed

- Keep tabs a fixed width and scroll the strip when they overflow. ([1c15c96](https://github.com/puuid-com/xml/commit/1c15c9670fb089535f31c2b5575cfe59cc5caf85))
- Fix file save races and document parsing edge cases. ([f3f12dd](https://github.com/puuid-com/xml/commit/f3f12dd470bf21095d7a917d6e27890ab5b7bd9a))
- Flag every malformed variable, not just a stray >. ([391303f](https://github.com/puuid-com/xml/commit/391303f5ca7dbc7155e69c1103740fd5ec09e5de))
- Flag a stray > next to a `<<var>>` as an error. ([7991a76](https://github.com/puuid-com/xml/commit/7991a7620b4eedcc0a43c07989987eb85bf53678))

### Maintenance

- Fix CI typecheck and make local checks match CI. ([9f328cd](https://github.com/puuid-com/xml/commit/9f328cd904c452d7bb24698e73a30d070ac9cf05))
- Tell agents to commit and push after each task. ([f405ab3](https://github.com/puuid-com/xml/commit/f405ab30f1e14ad3a00839e6db8fc49d1906fe80))
- Format PinnedFields with Prettier. ([9ffb778](https://github.com/puuid-com/xml/commit/9ffb778a0ec47ecf95117edad25500a8ccb67a88))

## [history-2026-10-27] - 2026-10-27

Reconstructed from Git history before versioning began. These are commit dates, not published releases.

### Added

- Add theme toggle to the command menu, drop per-tag highlights. ([3e5df03](https://github.com/puuid-com/xml/commit/3e5df03cb020143904807bee729c72e8775a2b51))
- Add a button to switch the variable style. ([4c18451](https://github.com/puuid-com/xml/commit/4c184512e2cb0e5b98a0854c281da8b1e5fe64a6))
- Add a format option to remove tag prefixes. ([de4c9db](https://github.com/puuid-com/xml/commit/de4c9dbce9ff55786d807f04f8b535d23e91ec11))
- Add copy button to pinned fields and confirm before unpinning. ([c6910ed](https://github.com/puuid-com/xml/commit/c6910ed55be13459a727f46a96801c35e439931c))
- Support `{{name}}` variables alongside `<<name>>`. ([935f866](https://github.com/puuid-com/xml/commit/935f8669b689863fbdabe7e8551da51b4f8b0f9b))

### Changed

- Show the tab's profile as a tag on the file name. ([d81c8c0](https://github.com/puuid-com/xml/commit/d81c8c04edd513d00b97696f11a5882678787186))
- Restyle the tab strip like browser tabs. ([d11066a](https://github.com/puuid-com/xml/commit/d11066a79d6ac74f838b1db837029d8a0e7d890b))
- Remove the logo button from the top bar. ([f3e785c](https://github.com/puuid-com/xml/commit/f3e785cf4d61a5752ebdb9bb3266cca39551b19a))
- Regroup the command menu and add a New JSON file shortcut. ([08db3cf](https://github.com/puuid-com/xml/commit/08db3cfd8d8975988480201f0374f0a36525656e))
- Switch the syntax palette to greyscale. ([f534bfb](https://github.com/puuid-com/xml/commit/f534bfb655dee12efcd7be23bf9bf00ae73dbbcd))
- Remove highlight ticks from the editor scrollbar. ([39f6092](https://github.com/puuid-com/xml/commit/39f60921f2873079119e91479e33e64da613a1f2))
- Clean up persistence handling and editor synchronization. ([bbe0185](https://github.com/puuid-com/xml/commit/bbe01859e0d8310d76fc0be5b36d9dffdc6a6b77))
- Mark tags as base64 ZPL labels and open them in the ZPL viewer. ([237b847](https://github.com/puuid-com/xml/commit/237b847859ca83e4d136f9ab7283c29de9cb6caa))
- Shorten long values in the editor, with copy. ([3962852](https://github.com/puuid-com/xml/commit/3962852b2827da833e4d2405aa94fcd813fc7ec6))
- Drop the pinned fields heading and add a copy-as-variable button. ([65f208f](https://github.com/puuid-com/xml/commit/65f208f5e5319ef1ad6684dd8e40c89f56fb6e35))
- Group pinned fields by highlight colour. ([9bf74bf](https://github.com/puuid-com/xml/commit/9bf74bf87140880b13b383417a190c3a2b9bf123))
- Let pinned fields be reordered by dragging. ([9002e88](https://github.com/puuid-com/xml/commit/9002e8851e9347f1aaf96cb4b49d1010818642e0))
- Group bottom-bar highlight chips by colour. ([fae80e5](https://github.com/puuid-com/xml/commit/fae80e5f9eea2e4c9666dde38a5dd51c34856035))
- Offer the profile's highlight colours first when picking. ([95c01f5](https://github.com/puuid-com/xml/commit/95c01f583c138076e3581591088ee10353fd42f3))
- Patch Redact events so Radix switches toggle again. ([dabc07c](https://github.com/puuid-com/xml/commit/dabc07ce5e00c48971e142c10b3f9c3d5ecd6cd3))
- Set the custom sort order from a template file. ([946b120](https://github.com/puuid-com/xml/commit/946b120f0851a2bc49a9be69e8f9561003d50ecd))
- Ask the browser to keep the workspace and remind about backups. ([1201372](https://github.com/puuid-com/xml/commit/120137200e570911dfe83feb11b737f450d0d177))
- Read disk write support through a hydration-safe hook. ([a3ffad1](https://github.com/puuid-com/xml/commit/a3ffad16e1d02980e44e66ac44f2b0407bbb7168))
- Save tabs back to the files they were opened from. ([2cb6a7a](https://github.com/puuid-com/xml/commit/2cb6a7aba9d8b9795434315a0f262b5de9b8bcf0))
- Store the workspace in IndexedDB instead of localStorage. ([f965535](https://github.com/puuid-com/xml/commit/f96553563b1dc81eacc245da35d54702f889483d))

### Fixed

- Keep the first highlight pill's ring inside the bottom bar. ([7b699ea](https://github.com/puuid-com/xml/commit/7b699ea46cbb98c1d778c1675271126fd78e925b))
- Stop browser autofill in the find and replace fields. ([bb98c8d](https://github.com/puuid-com/xml/commit/bb98c8df0f5403a21a72ec6e645b12b66714d3d5))
- Keep legacy rows IndexedDB refuses instead of losing the store. ([76ac8a8](https://github.com/puuid-com/xml/commit/76ac8a80c2ef97507f34587d537dcbf0ce0d1c45))

### Maintenance

- Format search.ts with Prettier. ([daa484f](https://github.com/puuid-com/xml/commit/daa484fba167acde6f024c9674a35a296ba0b18e))

## [history-2026-10-26] - 2026-10-26

Reconstructed from Git history before versioning began. These are commit dates, not published releases.

### Added

- Add a share button to the top bar. ([4235262](https://github.com/puuid-com/xml/commit/4235262a76d6e1b9a52c87125b2d7e4bd9cafdc5))
- Add a custom sort order to formatting. ([12b7dcc](https://github.com/puuid-com/xml/commit/12b7dcca8565ed978812b1f869475df1a4d52a21))

### Changed

- Remove offline service worker support. ([4a60328](https://github.com/puuid-com/xml/commit/4a6032860d08d79599d58c05ca12a1f6ae5d903b))
- Run the app on the TanStack Redact runtime. ([9c86276](https://github.com/puuid-com/xml/commit/9c86276ab84cebdc0493e379d03d93896de72382))
- Rename the project to xml. ([d150b22](https://github.com/puuid-com/xml/commit/d150b22546664decf3ea0fc03f712fe65b1ad60b))
- Switch tabs with Control and the arrow keys. ([4b8d79c](https://github.com/puuid-com/xml/commit/4b8d79cbafba9e74abcc1949e6863e81f4c3c444))
- Ignore namespace prefixes in profile tag rules. ([06dc1d4](https://github.com/puuid-com/xml/commit/06dc1d48073e654705d7adecb0652c5f53f7fcb7))
- Carry the file's profile in share links. ([536d689](https://github.com/puuid-com/xml/commit/536d689213ba3cd25d137a7cd246cbada8f35c51))
- Record browser check results and add tasks 8 to 11. ([8089d62](https://github.com/puuid-com/xml/commit/8089d62358fbe7a9d1878d5ed4ba812414c0725c))

### Fixed

- Silence React Doctor on eager CodeMirror and restore writes. ([97347c4](https://github.com/puuid-com/xml/commit/97347c445d6c8927edfebb4a62bd54dfdb54f7dd))

### Maintenance

- Replace finished fixes in TASKS.md with follow-ups. ([ee97c59](https://github.com/puuid-com/xml/commit/ee97c5989894eec8fbc7d9146b9c31a1598f1994))

### Merged

- Merge branch 'feat/share-profile'. ([b48ce38](https://github.com/puuid-com/xml/commit/b48ce38f1cbdf5111f7f67d334f4915d29a31bcd))
- Merge branch 'feat/custom-sort'. ([caeeb9a](https://github.com/puuid-com/xml/commit/caeeb9ae181d7de22b3802e1d6b18badc1e65dd7))
- Merge branch 'fix/browser-check'. ([ea1fc01](https://github.com/puuid-com/xml/commit/ea1fc01c92f8e87702eb6f6c2737ee95b1e19ac2))

## [history-2026-10-25] - 2026-10-25

Reconstructed from Git history before versioning began. These are commit dates, not published releases.

### Added

- Add offline support and app install with a service worker. ([cfb0546](https://github.com/puuid-com/xml/commit/cfb05462132a49c3cc524f83098a89317424d529))
- Add side-by-side comparison of two open tabs. ([ec08e77](https://github.com/puuid-com/xml/commit/ec08e77ee3bf94d3054ae852f26457859891f833))
- Add workspace backup and restore. ([6d228eb](https://github.com/puuid-com/xml/commit/6d228eb0dd2cec7a218c44267e02eeb84745c361))
- Add per-profile values for plain variables. ([9397a6d](https://github.com/puuid-com/xml/commit/9397a6d2dcad7264956182e376453a13a002def8))
- Add share links that carry a file in the URL fragment. ([cc9b270](https://github.com/puuid-com/xml/commit/cc9b2704a761624947572cc403f77badafc92a33))
- Add a light/dark theme toggle to the status bar. ([2141d28](https://github.com/puuid-com/xml/commit/2141d28d72ef281c9d36a4b774f2257dde43c4f5))
- Add settings profiles, file archive and structure search. ([73000a5](https://github.com/puuid-com/xml/commit/73000a55ad90f496321347ca413eaf8fba691467))
- Add VS Code-style app shortcuts with TanStack Hotkeys. ([c489a8e](https://github.com/puuid-com/xml/commit/c489a8e3365c0445677a60e633ca339a988ecabb))
- Add a pinned fields bar above the editor. ([6c45777](https://github.com/puuid-com/xml/commit/6c457778afed35346b500f7bbd75d6a9c41df225))

### Changed

- Include variables in workspace backups. ([5676b6b](https://github.com/puuid-com/xml/commit/5676b6b5cdc0060e8182a5c459bda9ca5e45fae3))
- Load the compare view on first use. ([d00bbfc](https://github.com/puuid-com/xml/commit/d00bbfcf42e204cdab7d3a46be435b8fa50e86db))
- Restyle completion popup with a variable preview panel. ([8d9998f](https://github.com/puuid-com/xml/commit/8d9998fc8a922fb5dbb7a6f3a8703aec223a0605))
- Open replaced dynamic variables in a new file. ([c98add9](https://github.com/puuid-com/xml/commit/c98add9f2a611e526fe476f03fbe51fbd721cd41))
- Replace Postman dynamic variables with generated values. ([37adff8](https://github.com/puuid-com/xml/commit/37adff8d0cbf2c2f9e93d85691d61785fb71ae33))
- Mark elided path middles with a bordered marker. ([cc6589f](https://github.com/puuid-com/xml/commit/cc6589f0e382b786048f34e4cbe74adf0180c925))
- Elide the middle of long paths in menu headers. ([58a96a4](https://github.com/puuid-com/xml/commit/58a96a48005f7fb8c9d1558c3c6203387f4d5e7b))
- Redesign context menus with a header and inline colours. ([9e0eb19](https://github.com/puuid-com/xml/commit/9e0eb19b1ff6372a08f79fa57a2146e0f8157335))
- Copy standard XPath, JSONPath and JSON Pointer paths. ([16b2e07](https://github.com/puuid-com/xml/commit/16b2e073f51627e548f885ff60397af3fccba6da))
- Highlight search hits in the structure tree. ([a0a76f4](https://github.com/puuid-com/xml/commit/a0a76f48ac4068c4f732f37ea7a29df6504d58e1))
- Show notifications in the status bar instead of toasts. ([659b829](https://github.com/puuid-com/xml/commit/659b82934cad89a8aab43e92d59e522001a2695e))
- Extract shared UI pieces and a shortcut registry. ([8ac88d6](https://github.com/puuid-com/xml/commit/8ac88d62050a8e9594e8381554da60912dd7035c))
- Split editor extensions and share syntax helpers. ([87ebd9c](https://github.com/puuid-com/xml/commit/87ebd9c7d9ff104db73dd13120697fa70285d093))
- Share store persistence helpers. ([8efdc9f](https://github.com/puuid-com/xml/commit/8efdc9f1a3a11ebe8238c3000848c2675cc542f6))
- Simplify the bottom bar and confirm before applying defaults. ([a005191](https://github.com/puuid-com/xml/commit/a00519159df4b02d50f2c0b559785a9e79f1b1c1))
- Make the structure tree keyboard-accessible. ([19414d5](https://github.com/puuid-com/xml/commit/19414d58e3f3eaddef710f14131573d64c6bb0d0))
- Move pinned fields into the side panel. ([730b139](https://github.com/puuid-com/xml/commit/730b139cbd9cc7707c16060534c31b8c81f604e5))
- Span the pinned bar across both panels. ([eb36381](https://github.com/puuid-com/xml/commit/eb36381d0e0eeff84285018af855ac28a683da1f))
- Sync scrolling between the editor and the structure tree. ([3c43ca1](https://github.com/puuid-com/xml/commit/3c43ca10a99080528c6729c089a9f7ed4f04183b))
- Underline differing values in the structure tree. ([4fe340b](https://github.com/puuid-com/xml/commit/4fe340b39219a9f88bece04875e1affb27f0171a))
- Underline values that differ from their default. ([f8e0775](https://github.com/puuid-com/xml/commit/f8e0775e20183b32fc149944572096761cb11bcf))
- Accept Postman dynamic variables like `<<$randomInt>>`. ([9aea957](https://github.com/puuid-com/xml/commit/9aea957b6a98662a94214b394a6059cf46857f51))
- Mark values that already equal their default. ([6527a55](https://github.com/puuid-com/xml/commit/6527a553d8dfa450c6a7b2c34ecda1ad31777a0f))

### Fixed

- Keep storage events reaching collections after a write wrapper. ([8f4e954](https://github.com/puuid-com/xml/commit/8f4e954709a6738b08db8fe99d49fd8afd6b696f))
- Serve the locale shell for uncached pages offline. ([17848ce](https://github.com/puuid-com/xml/commit/17848cea8871e64b8aebd4e17b16be2753955e32))
- Report failed saves from every collection. ([57a4e75](https://github.com/puuid-com/xml/commit/57a4e756c0794ae9e91c353b517688f0e9db705d))
- Roll back a restore that fails partway. ([e84e8c0](https://github.com/puuid-com/xml/commit/e84e8c034b0f1e1220b9372466e93d6f55b3ce3e))
- Keep update notices and errors under short-lived notices. ([da18a68](https://github.com/puuid-com/xml/commit/da18a685a250d15f2c99c874498eb1f41af88335))
- Keep highlight chips fixed when a notice appears. ([a2dc44f](https://github.com/puuid-com/xml/commit/a2dc44fd9f16c7b663381713b3a7059f3b788800))
- Fix React Doctor findings. ([a0a62f7](https://github.com/puuid-com/xml/commit/a0a62f776d4e2830ec3d4e7a6b791bf4c653127c))

### Maintenance

- Replace shipped features in TASKS.md with follow-ups. ([02cd952](https://github.com/puuid-com/xml/commit/02cd952cbdeec5c2f5855ecf77c634531bb73976))
- Add TASKS.md with five ranked feature ideas. ([0d8f635](https://github.com/puuid-com/xml/commit/0d8f635c0d4dade00a5295f007867fccce6ac8dc))
- Remove dead code and unused dependencies. ([ab50c8a](https://github.com/puuid-com/xml/commit/ab50c8a27abec3f5097fc736c382bf66648d88c4))
- Add React Doctor scanner. ([ce103d4](https://github.com/puuid-com/xml/commit/ce103d4f656265988085345b93e6b00d293f4b3b))

### Merged

- Merge branch 'fix/offline-pages'. ([52c5251](https://github.com/puuid-com/xml/commit/52c52511ae04d1a63ce14dac092735f1729ed7f3))
- Merge branch 'fix/report-failed-saves'. ([f2b061a](https://github.com/puuid-com/xml/commit/f2b061adc6379bd0330accabc1b6a443df34e3c3))
- Merge branch 'fix/atomic-restore'. ([d0838b2](https://github.com/puuid-com/xml/commit/d0838b2011af12f8117b6d372a7db0a1d1abbb33))
- Merge branch 'fix/backup-variables'. ([bc21d8a](https://github.com/puuid-com/xml/commit/bc21d8aba7d472e82de908f388b9326230259f6a))
- Merge branch 'fix/sticky-notice'. ([6ab4370](https://github.com/puuid-com/xml/commit/6ab43706a7160e5aaeead83c9d3bb6f21c65ef1c))
- Merge branch 'feat/offline-pwa'. ([9a59a77](https://github.com/puuid-com/xml/commit/9a59a774b9ec87ab574d9b9c43c1ccd8b3a3c2a3))
- Merge branch 'feat/compare-files'. ([40216ca](https://github.com/puuid-com/xml/commit/40216ca1185496a0cfa5137187f692f699ce5efe))
- Merge branch 'feat/share-link'. ([373dcc1](https://github.com/puuid-com/xml/commit/373dcc11e881259168a1b57b4e19337a5209ce25))
- Merge branch 'feat/profile-variables'. ([ce0ec15](https://github.com/puuid-com/xml/commit/ce0ec15c57eb001a397a33a07794b5933a4b5107))
- Merge branch 'feat/workspace-backup'. ([adbf9af](https://github.com/puuid-com/xml/commit/adbf9af3f58a168eec499754645feb7da8a012ce))

## [history-2026-10-24] - 2026-10-24

Reconstructed from Git history before versioning began. These are commit dates, not published releases.

### Added

- Add JSON support alongside XML. ([a1db705](https://github.com/puuid-com/xml/commit/a1db705b068c6dcaa7a6cafae8fa132ee21a75ea))
- Add default values that can be applied to the open file. ([5468a6f](https://github.com/puuid-com/xml/commit/5468a6fc0ec7e751397487d4ae50e3d7cd04377d))
- Add right-click highlight menu on editor tags. ([0ba20be](https://github.com/puuid-com/xml/commit/0ba20be59db7be199caf877287e78813cb134ae2))
- Add "highlighted tags first" format option. ([42df9b0](https://github.com/puuid-com/xml/commit/42df9b018b3fb486b39ddd3c97138fcbd41313cb))
- Add format options, format on save; drop minify. ([a9e16b6](https://github.com/puuid-com/xml/commit/a9e16b6537224719d4c75e0691be65b2d75d4d69))
- Build the XML editor: CodeMirror, synced tree, tag highlights. ([159bdf0](https://github.com/puuid-com/xml/commit/159bdf074c42535ce1c147b2c2e043cac22e672e))
- Add local cache for files and tag highlights. ([846541b](https://github.com/puuid-com/xml/commit/846541b15cb96c98df96fd5930e94d77cbf1f912))
- Add XML core: parse, format, edit and locate. ([22892b1](https://github.com/puuid-com/xml/commit/22892b1e287ebeedcbbb1efd0a9ba11e429736c8))
- Initial commit. ([c448ae4](https://github.com/puuid-com/xml/commit/c448ae4291a8ab747f003450d7ac3c6a520785e2))

### Changed

- Remove the load sample actions. ([b9f57e5](https://github.com/puuid-com/xml/commit/b9f57e57ad7a4c5dab7ebf5734531b767049a491))
- Delete a file when its tab closes. ([855c637](https://github.com/puuid-com/xml/commit/855c6378e0b79dc632e384b3fb8f93609d70a906))
- Color parent tags apart from leaf tags. ([81f056b](https://github.com/puuid-com/xml/commit/81f056b0885ddaec954572bd18be4a7b5ee0be6f))
- Center the command menu and open it from the bottom bar. ([19f94f5](https://github.com/puuid-com/xml/commit/19f94f5e81beb685068d2977de7f1408182da888))
- Turn the file menu into a searchable command menu. ([6822eaf](https://github.com/puuid-com/xml/commit/6822eaf5b39e06cf0c7cfbe6fbe4f7d22fc9129b))
- Confirm before closing a file tab. ([6ca96ab](https://github.com/puuid-com/xml/commit/6ca96ab71d7ba7ed22c3692cd36b782fc5c35cc3))
- Move editing tools to the bottom bar and slim the top bar. ([3d8d69f](https://github.com/puuid-com/xml/commit/3d8d69fd50ce481bbe63ae01eaf9e7cf016f6d35))
- Restyle variables as grey chips with a variable icon. ([abffd02](https://github.com/puuid-com/xml/commit/abffd02434c033ba8db02cfef0f5670cce61fd14))
- Turn format options menu into a settings popover. ([70a82f9](https://github.com/puuid-com/xml/commit/70a82f9d2323f2331de1ee2dc7da3f5341bfa946))
- Cycle through occurrences when clicking a highlight chip. ([0901723](https://github.com/puuid-com/xml/commit/0901723a1dbefaaf353d1c03aff95eb079066322))
- Jump to first occurrence when clicking a highlight chip. ([048cfc8](https://github.com/puuid-com/xml/commit/048cfc84827fc043a93cb5b659c92ae61e6cbc5d))
- Shorten toast duration to 1.5s. ([e72e366](https://github.com/puuid-com/xml/commit/e72e3667754732706e8908205dfbfe8067b4693a))
- Highlight whole tags with a tinted wash instead of name chips. ([192eb68](https://github.com/puuid-com/xml/commit/192eb689904f4cc33914db3e0a53be26a1a97478))
- Remove Inspector panel and lock the editor to the viewport. ([213c054](https://github.com/puuid-com/xml/commit/213c054bafe0416625d3b44e0ea7b6c79db67e10))
- Rework tag highlights: solid chips, legend bar, Alt+H picker. ([f2be696](https://github.com/puuid-com/xml/commit/f2be696a53248c098e9019d8c1f93123fb46ef91))
- Disable overscroll on html and body. ([4a95d70](https://github.com/puuid-com/xml/commit/4a95d700ac584495ecf60bbf4f9351de60f6d76a))
- Use shadcn's cn package for class merging. ([4cf2143](https://github.com/puuid-com/xml/commit/4cf2143f06b33b60effe7d2925c6d6d80018c9cf))

### Maintenance

- Fix build warnings: split vendor chunks, SSR sourcemap. ([05e3c7d](https://github.com/puuid-com/xml/commit/05e3c7d3fed0eda0e58d5af23c2c740f6edd770a))
- Add xml.puuid.com custom domain to wrangler. ([97a7464](https://github.com/puuid-com/xml/commit/97a7464cf3b1c29bd9c78d418f7ef1b181953b7e))
- Keep stores alive across hot reloads; add diffChange. ([7f8acf0](https://github.com/puuid-com/xml/commit/7f8acf005160fa2cc6b111d22a739a4b1742117d))
- Add editor dependencies and shadcn components. ([318fdde](https://github.com/puuid-com/xml/commit/318fdde06046459ad9ec156912b70134d359649b))

### Merged

- Merge header, tabs and highlights into a single top bar. ([24fe069](https://github.com/puuid-com/xml/commit/24fe06934d37438af915a69a9325b17e70518b38))
