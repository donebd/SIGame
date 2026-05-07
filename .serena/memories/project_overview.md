# SIGame — Project Overview

## Purpose
Web-based self-hosted game engine for offline quiz parties in the "SIGame" format (similar to "What? Where? When?"). Supports folder-based and .siq package formats.

## Tech Stack
- **Language**: TypeScript (strict)
- **Bundler**: Webpack 5 + ts-loader
- **Testing**: Jest (unit) + Playwright (e2e)
- **Real-time sync**: BroadcastChannel API (local) + PeerJS/WebRTC (remote)
- **QR codes**: `qrcode` npm package
- **SIQ parsing**: JSZip + fast-xml-parser
- **Styles**: Vanilla CSS (no frameworks)
- **No frontend framework** (pure TS/DOM manipulation)

## Key Architecture
- `src/app.ts` — main entry point
- `src/mobile.ts` — mobile remote control entry point
- `src/services/GameController.ts` — central command dispatcher (Command Pattern)
- `src/services/SyncService.ts` — sync manager (multi-provider: BroadcastChannel + PeerJS)
- `src/services/sync/ISyncProvider.ts` — provider interface
- `src/services/sync/BroadcastChannelProvider.ts` — default (same browser)
- `src/services/sync/PeerSyncProvider.ts` — WebRTC P2P (cross-device)
- `src/state/GameState.ts` — state manager
- `src/ui/AdminUI.ts`, `TVScreen.ts`, `FinalRoundView.ts`

## Build Output
- `dist/SIGame.html` — **single self-contained HTML** (JS+CSS inlined via custom Webpack plugin)
- `dist/mobile.html` — lightweight mobile remote control (NOT inlined; separate JS file)

## Version
Current: **2.0.0** (2026-02-06)
