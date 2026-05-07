# SIGame — Code Style & Conventions

## TypeScript
- Strict TypeScript (no `any` unless forced)
- All services are plain classes (no decorators/DI framework yet)
- Constructor injection used manually
- Interfaces prefixed with `I` (e.g., `ISyncProvider`)
- Async/await for all async operations

## Naming Conventions
- **Classes**: PascalCase (`GameController`, `SyncService`)
- **Files**: PascalCase for classes (`GameController.ts`), camelCase for utils (`helpers.ts`)
- **Methods**: camelCase, verb-first (`handleToggleAudio`, `sendSpecialPreview`)
- **Types/Interfaces**: PascalCase (`GameState`, `BroadcastMessage`)
- **Private methods**: prefixed with `handle` when they are action handlers

## Patterns
- **Command Pattern** in `GameController.dispatch()` with `switch` on `action.type`
- **Provider Pattern** in `SyncService` with `ISyncProvider` interface
- **State Manager** pattern — `GameStateManager` owns all mutable state
- No React/Vue/Angular — pure DOM manipulation via `document.querySelector`

## CSS
- Vanilla CSS in `src/styles.css` and `src/results.css`
- No CSS framework

## Comments
- JSDoc-style comments on service methods
- Inline comments for non-obvious logic

## Linting / Formatting
- No linter configured (eslint not in package.json)
- TypeScript compiler as primary type check: `npm run type-check`
