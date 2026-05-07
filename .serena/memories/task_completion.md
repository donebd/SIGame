# SIGame — Task Completion Checklist

When finishing a coding task in SIGame, do:

1. **Type check**: `npm run type-check` — must pass with no errors
2. **Unit tests**: `npm test` — all Jest tests must pass
3. **Build**: `npm run build` — must produce `dist/SIGame.html` and `dist/mobile.html`
4. **Manual smoke test** (dev server):
   - `npm start` (starts webpack-dev-server on :9000 + PeerJS on :9001)
   - Open `http://<local-ip>:9000/SIGame.html`
   - Verify admin panel loads
   - Open TV screen
   - Test Remote Control QR flow if relevant
5. **Update CHANGELOG.md** with changes under the correct version heading
6. **Update README.md** if new features affect usage instructions

## Key known issues (as of 2026-05-08)
- Duplicate `case 'OPEN_SPECIAL':` in `GameController.ts` (lines 79-83, 82-84) — dead code
- `mobile.html` is NOT self-contained (separate `mobile.js`), unlike `SIGame.html`
- `PeerSyncProvider` hardcodes port 9001 with no fallback/config
- PeerJS requires a running PeerJS server (`npm run peer-server`) — not documented in README
- README "Project Structure" section does not list `GameController.ts` or `mobile.ts`
