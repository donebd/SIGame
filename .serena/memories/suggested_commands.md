# SIGame — Suggested Commands (Windows / PowerShell)

## Development
```powershell
npm install              # Install dependencies
npm run dev              # Webpack watch mode (no server)
npm run serve            # Webpack dev server on :9000
npm start                # dev server + PeerJS server on :9001 (concurrently)
```

## Build
```powershell
npm run build            # Production build -> dist/SIGame.html + dist/mobile.html
```

## Type Checking
```powershell
npm run type-check       # tsc --noEmit
```

## Testing
```powershell
npm test                 # Jest unit tests
npm run test:watch       # Jest watch mode
npm run test:e2e         # Playwright e2e tests
```

## Peer Server (for Remote Control)
```powershell
npm run peer-server      # peerjs --port 9001 --key peerjs --path /
```

## Git (Windows)
```powershell
git status
git log --oneline -10
git diff
```
