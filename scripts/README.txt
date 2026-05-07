============================================================
  SIGame v2.1.0 — Self-hosted Quiz Engine
  https://github.com/donebd/SIGame
============================================================

CONTENTS OF THIS ARCHIVE
--------------------------
  SIGame.html              — Main app (Admin panel + TV screen)
  mobile.html              — Mobile remote controller (phone browser)
  start-peer-server.bat    — Start servers (Windows)
  start-peer-server.sh     — Start servers (macOS / Linux)
  README.txt               — This file
  README.ru.txt            — Instructions in Russian


HOW TO PLAY (no phone, basic mode)
------------------------------------
1. Open SIGame.html in Chrome or Edge (double-click is enough)
2. Load a question pack (.siq file or a folder)
3. Add players, click "Open TV Screen" for the projector/second monitor
4. Start the game!

No installation. No internet required. Works offline.


REMOTE CONTROL (host controls from phone)
------------------------------------------
Lets the game host sit with the players at the table and control the
game from their smartphone — no need to be at the PC.

The game itself (admin panel + TV screen) still runs entirely on the PC.
The phone is just a wireless remote for the host.

All devices must be on the same Wi-Fi network.

Requirements:
  - Node.js on the host PC (https://nodejs.org) — one-time install

Steps:
  1. Run the server script (starts a file server + PeerJS):
       Windows  → double-click  start-peer-server.bat
       macOS    → open Terminal, drag the .sh file in, press Enter
       Linux    → bash start-peer-server.sh

     The script prints a URL like:
       http://192.168.x.x:9000

  2. Open that URL in Chrome on THIS computer (not SIGame.html directly)
  3. Click [🎮 Remote Control] — a QR code appears
  4. Scan the QR code with your phone — done!

  Keep the terminal/cmd window open while playing.

  macOS note: if macOS blocks the script, run once in Terminal:
    xattr -d com.apple.quarantine start-peer-server.sh


TROUBLESHOOTING
----------------
  - Phone can't connect?
    → Make sure the PC and phone are on the same Wi-Fi network
    → Check that the server window is still open
    → Try disabling VPN

  - Nothing shows on TV screen?
    → Click "Open TV Screen" in the admin panel
    → Both windows must be in the same browser (same profile)

============================================================
