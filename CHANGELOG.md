# Changelog

All notable changes to this project will be documented in this file.

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
