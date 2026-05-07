# Implementation Details: Mobile Remote Control (v2.1.0)

## Overview

The Mobile Remote Control feature lets the Game Master control the game from a smartphone via WebRTC (PeerJS). No native app is required — the controller opens as a self-contained `mobile.html` page in the phone's browser.

## Architecture

### 1. GameController (`src/services/GameController.ts`)
Central command dispatcher using the Command Pattern.
- Receives strongly-typed `GameAction` discriminated union commands.
- Uniform handling regardless of source: desktop click, mobile phone, or future hardware button.
- Also handles chunked `.siq` pack uploads from mobile (with per-upload TTL cleanup).

### 2. Synchronization Layer (`src/services/SyncService.ts`)
Manages a list of `ISyncProvider` implementations:

| Provider | File | When Active |
|---|---|---|
| `BroadcastChannelProvider` | `sync/BroadcastChannelProvider.ts` | Always (Admin ↔ TV in same browser) |
| `PeerSyncProvider` | `sync/PeerSyncProvider.ts` | On demand — when "Remote Control" is clicked |

`SyncService.initPeerSync()` is idempotent — calling it multiple times reuses the existing provider.

### 3. Mobile Client

| | |
|---|---|
| **Entry point** | `src/mobile.ts` |
| **Template** | `src/mobile.template.html` (dev) → inlined at build time |
| **Connection** | Scans QR code on desktop → extracts `?host=PEER_ID` → connects via PeerJS |
| **Sends** | `GAME_ACTION` messages (`GameAction` discriminated union) |

### 4. Build & Distribution

```
npm run build   → dist/SIGame.html + dist/mobile.html  (both fully self-contained)
npm run package → SIGame-vX.X.X.zip  (ZIP of both HTML files)
```

Both output files have all JS and CSS inlined — no external dependencies at runtime.  
Only a PeerJS signaling server (`peerjs --port 9001`) is needed **at runtime** for WebRTC to establish the connection.

## How It Works — Step by Step

1. **Host** opens `SIGame.html` → clicks **🎮 Remote Control**
2. `SyncService.initPeerSync()` initialises `PeerSyncProvider` → gets a Peer ID
3. Admin UI generates a QR code: `http://<host-ip>:<port>/mobile.html?host=<PEER_ID>`
4. **Phone** scans QR → `mobile.ts` extracts `host` param → connects via PeerJS
5. Phone sends `{ type: 'GAME_ACTION', action: GameAction }` messages over WebRTC
6. `PeerSyncProvider` receives → passes to `SyncService` → `GameController.dispatch()` executes

## Type Safety

`GameAction` is a full discriminated union — TypeScript narrows `payload` automatically in every `switch` case. No `any` casts in the action handling path.
