# SIGame Roadmap & Ideas

This document tracks potential directions for the project, from infrastructure improvements to AI experiments.

## 1. Controls & Interactions

- **✅ Mobile Remote Control** — shipped in v2.1.0  
  Control the game from your phone via QR code (PeerJS/WebRTC). See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

- **Physical Buzzer Support**:
  - *USB HID*: Off-the-shelf buzzer systems emulate a keyboard → plain `keydown` listeners in JS.
  - *Web Serial API*: Arduino / DIY buttons — direct COM port reading.
  - *ESP32 + Wi-Fi*: Wireless buttons join the same Peer network over Wi-Fi.

## 2. Tooling & Formats

- **SIQ ↔ Folder Converter ("Unpacker")**:
  - *Problem*: `.siq` is a binary archive — hard to edit media files without special tools.
  - *Idea*: CLI utility or built-in function: unpack `.siq` → `json + media` folder → user swaps files → repack.

- **Visual Theme Editor (Skin Editor)**:
  - *Idea*: UI builder for custom themes (colors, fonts, backgrounds) with CSS/JSON export.

## 3. AI Integration

- **AI Pack Generator**:
  - *Idea*: Enter "Make a Harry Potter pack, hard difficulty, 3 rounds" → get a ready-to-play `.siq` pack.
  - *Implementation*: OpenAI/Anthropic API for questions, DALL-E for images.

- **TTS Announcer**:
  - *Idea*: Automatically read questions aloud via Web Speech API or external TTS — reduces load on the live host.

- **AI Arbiter**:
  - *Idea*: Validate player answers. "Answer: Pushkin" — player says "Alexander Pushkin" → AI marks it correct.

## 4. Streaming & Social

- **Twitch / YouTube Integration**:
  - Chat votes on answer options or picks the next round theme.
  - OBS overlay: transparent window with current score and question for stream viewers.

- **Spectator Web Mode**:
  - Viewers join from their phones (Jackbox-style) — watch game status or participate in a side bet.

## 5. Technical Debt & Improvements

- **Lazy loading / code splitting**: Reduce `bundle.js` size (currently ~390 KB) via dynamic `import()`.
- **DI container (tsyringe / Inversify)**: Improve modularity and testability — current DI is manual constructor injection.
- **E2E tests**: Playwright tests for key game flows (question selection, scoring, final round).
- **PWA**: Full offline support and installable app experience.
