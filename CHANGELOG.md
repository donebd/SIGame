# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2026-05-08

### Added
- **Mobile Remote Control**: Control the game from any smartphone via QR code (PeerJS/WebRTC).
  - Release ZIP now includes `start-peer-server.bat` (Windows) and `start-peer-server.sh` (macOS/Linux) — double-click to start the signaling server, auto-installs `peer` on first run.
  - Scan QR code in Admin UI → open `mobile.html` on the phone → full game control.
  - Supports: Next/Show Question, Show Answer, Award Points (full/half/minus), Back to Grid, Switch Round, Ban Theme.
  - **Pack upload from mobile**: Upload `.siq` packs directly from a phone via chunked binary transfer.
- **`src/config.ts`**: Centralised configuration for `PEER_PORT` and `PEER_HOST` (with automatic `localhost` fallback when opened as a local `file://`).

### Fixed
- **`mobile.html` is now fully self-contained** in production builds: `mobile.js` is inlined just like `bundle.js` is inlined into `SIGame.html`. No extra files needed in the release ZIP.
- **PeerJS connection via `file://`**: `PeerSyncProvider` and `mobile.ts` no longer pass an empty hostname to PeerJS when the app is opened as a local HTML file.
- **Duplicate `OPEN_SPECIAL` action handler** removed from `GameController` (dead code, no behaviour change).
- **Double `initPeerSync()` guard**: clicking "Remote Control" multiple times now reuses the existing `PeerSyncProvider` instead of creating a new one.
- **Category order in Admin grid**: categories are now shown in the original question-pack order instead of being sorted alphabetically.
- **XSS risk in Admin player list**: inline `onclick` strings in `innerHTML` replaced with proper `addEventListener` / DOM API calls.

### Changed
- Release now ships as a **ZIP archive** with two self-contained HTML files: `SIGame.html` + `mobile.html`.
- `SyncService` and `PeerSyncProvider` use `PEER_HOST` / `PEER_PORT` from `src/config.ts`.

## [2.0.0] - 2026-02-06

### Added
- **Full .siq support**: Comprehensive parsing of SIGame packages.
  - Automatic media extraction (images, audio, video).
  - Support for multiple content items in questions and answers.
  - Detection of final rounds based on types, names, and position.
- **New 'Select' Question Type**: Support for multiple-choice questions with answer options displayed on the player screen.
- **Enhanced Final Round Logic**: Interactive final round UI where players can ban themes one by one.
- **Responsive TV Screen**: Improved layout for various resolutions and text scaling for long questions.
- **Results Screen Overhaul**: New animated podium with Gold, Silver, and Bronze pedestals.

### Changed
- **Enhanced Admin UI**:
  - Wider GM panel for better control.
  - Improved active question highlighting and round switching animations.

### Fixed
- **Round Ordering**: Fixed an issue where rounds were sorted alphabetically instead of preserving original package order.
- **UI Inconsistencies**: Fixed visibility issues between the main grid and final round containers.

## [1.0.0] - 2026-01-20

### Initial Release
- Basic engine with folder-based question loading.
- Real-time synchronization via BroadcastChannel.
- Admin Panel and TV Screen components.
- Support for Mashup, Audio, Video, and Text question types.
- Special cards (Cat in a Bag, Bet, Auction).
- Holiday effects and animations.
