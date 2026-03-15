# Auto-Solve Resolver Plan

## Current Status

**As of Phase 3 completion:**

| Component | Status |
| --- | --- |
| UI — Auto Solve / Cancel / Solving buttons | ✅ Complete |
| Queue metadata (`source`, `sessionId` on moves) | ✅ Complete |
| `handleAutoSolve` — guard, session, telemetry, enqueue | ✅ Complete |
| `handleCancelSolve` — filter by sessionId, reset lock | ✅ Complete |
| `handleMoveDone` — completion tracking per session | ✅ Complete |
| `src/utils/telemetry.ts` — `track()` stub wired | ✅ Complete |
| Solver scaffold (`solveCube`, `SolverFailure`, types) | ✅ Complete |
| Beginner-layer strategy + macro stubs | ✅ Scaffolded (algorithm bodies TODO) |
| Actual solving algorithm (cross/F2L/OLL/PLL macros) | ❌ TODO — macro bodies are empty stubs |
| Integration tests (`autoSolve.test.ts`) | ✅ Complete (Phase 3 / T10) |
| Queue cancel regression tests (`moveQueueCancel.test.ts`) | ✅ Complete (Phase 3 / T11) |
| Docs + QA checklist | ✅ Complete (Phase 3 / T12) |

> **Important**: The Auto Solve button is fully wired to the UI, queue, and telemetry.
> However, because the beginner-layer macro bodies are placeholder stubs (cross/F2L/OLL/PLL yield
> empty move lists), `solveCube` currently throws `SolverFailure('unsolved')` for any scrambled
> state. The scene catches this gracefully and completes with 0 moves — the button exists and
> demonstrates the full UI flow, but won't produce an actual solving sequence until Phase 4
> implements the algorithm macros.

---

## Overview
The goal is to add an auto-solve button that restores the currently displayed cube to its solved state while respecting the existing animation pipeline. The feature must reuse the scene's move queue, operate on the live cube state, and emit the same visual feedback as manual or shuffle-driven moves so that users can trust the transition back to a solved cube.

## Phases
| Phase | Objective | Key Deliverables | Status |
| --- | --- | --- | --- |
| Research | Document solver requirements, cube state constraints, expected runtime, and UX needs. | Problem statement, constraints checklist, success criteria. | ✅ Complete |
| Algorithm Selection | Compare solving techniques, choose one (or hybrid) that balances determinism, speed, and implementation effort. | Decision doc with justification, sequence format spec. | ✅ Complete |
| Integration & Data Flow | Build the solver module, wire it to state helpers (`createInitialState`, `applyMove`), and expose an API that yields move descriptors compatible with `moveQueueRef`. | Solver module, typed interfaces, hooks in `RubiksCubeScene.tsx`. | ✅ Complete (Phase 1 + 2) |
| UI/UX | Add button, disabled states, progress indicators, optional cancel/reset. Ensure parity with shuffle control styling. | UI component updates, copywriting, accessibility review. | ✅ Complete (Phase 2) |
| Testing | Unit tests for solver correctness, integration tests for queue interaction, manual/visual QA on scramble/solve loops. | Vitest suites, storybook/manual script, QA checklist. | ✅ Complete (Phase 3) |
| Rollout | Analytics hooks, documentation updates, feature flag or staged exposure if needed. | Release notes, telemetry dashboards, fallback logic. | ⏳ Pending algorithm implementation |

## Solver Module Snapshot

- **Entry Point**: `solver/solveCube.ts` exposes `solveCube(snapshot, options)` plus typed exports in `solver/index.ts` for UI integrations.
- **Scaffolding Status**: Beginner-layer strategy folders (`strategies/beginnerLayer.ts` and `macros/*`) exist with deterministic generators. Macro bodies are intentionally empty placeholders but yield named macros per phase (cross/f2l/oll/pll) to keep the shape stable for downstream work.
- **Limits**: `MAX_MOVES = 160` guards runaway strategies. `MAX_SCRAMBLE_LENGTH = 200` enforces spec guidance.
- **Validation**: `solveCube` clones incoming cubies, asserts 27 unique positions, and compares against a solved template before returning results. Any mismatch raises `SolverFailure('unsolved')` until macros are fleshed out.
- **Testing**: `src/solver/__tests__/solveCube.test.ts` covers solved/invalid cases, limit enforcement, mutation safety, and deterministic failures via fixtures in `__fixtures__/scrambles.ts`.

## Algorithm Options
| Approach | Pros | Cons |
| --- | --- | --- |
| Beginner Layer Method (Layer-by-Layer) | Easy to reason about, sequences mirror human solvers, simpler to explain in docs, good for showcasing steps. | Longer solution sequences (~100+ moves), slower animations, harder to guarantee deterministic timing, may bore advanced users. |
| Thistlethwaite | Guaranteed ≤ 45 moves, conceptually staged (G0→G3) so progress can be shown, fits cube group theory. | Implementation complexity (needs group reductions), requires pruning tables, higher initial engineering effort. |
| Kociemba Two-Phase | Typically 20–25 moves, popular in cube software, existing JS implementations available, deterministic output. | Requires large pruning tables (memory), licensing considerations if using third-party code, more complex debugging. |
| Human-Friendly Sequences Library | Curated list of CFOP or beginner algorithms executed conditionally (e.g., OLL/PLL cases). | Flexible storytelling (showing named algorithms), can reuse educational content. | Needs robust cube-state recognition, may fail if state detection incomplete, maintenance burden. |

Decision guidance:
- Start with Kociemba if performance and brevity are top priorities and memory overhead is acceptable.
- Prefer Beginner Layer if educational clarity outweighs speed.
- Keep architecture modular so algorithm choice can be swapped without touching UI.

## Data Flow & Integration
- **Entry point**: The auto-solve button (likely in `RubiksCubeScene.tsx` controls overlay) invokes `handleAutoSolve()`.
- **State snapshot**: `handleAutoSolve()` reads the authoritative cubie state (`cubeStateRef` or React state) and passes it to `solveCube(state) -> MoveDescriptor[]`.
- **Move descriptors**: Solver returns the same `{ face: FaceKey; direction: 'CW' | 'CCW'; double?: boolean }` objects already consumed by `moveQueueRef`. Double moves should expand to two single moves to avoid animator changes.
- **Queue injection**: Append solver moves to `moveQueueRef.current`. If the queue or animation is active, the solver sequence waits its turn; otherwise the first move begins immediately via existing `useFrame` loop.
- **Cancellation/fallback**: Maintain `autoSolvePromiseRef` and allow a cancel button to clear outstanding solver moves (`moveQueueRef.current = []`) and re-enable manual control.
- **State consistency**: `onMoveDone` already applies `applyMove` to the source of truth, so no additional syncing is required. Ensure solver receives an immutable copy to avoid mutation.
- **Telemetry hooks**: Fire analytics events when solver starts, completes, or aborts. Include duration and move count for performance monitoring.

## Testing Strategy
- **Unit tests**
  - Validate that `solveCube(createInitialState())` returns an empty array.
  - Round-trip tests: scramble with random sequences (length 5–20), run solver, assert resulting state equals `createInitialState()`.
  - Determinism checks: identical scrambles yield identical solver sequences.
  - Timing: ensure solver finishes under an acceptable threshold (e.g., <50 ms) for average scrambles.
- **Integration tests**
  - Simulate user interactions that enqueue shuffles, wait for queue drain, invoke auto-solve, ensure no residual moves remain.
  - Verify UI states: button disabled while solving, cancellation restores manual controls.
- **Visual/manual QA**
  - Observe animations for jitter when large sequences run; confirm camera/orbit controls remain usable.
  - Test across devices (desktop, mobile Safari/Chrome) for performance parity.
  - Use deterministic scrambles to compare before/after states via screenshot diffing if available.

## Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Solver performance stalls UI | Animations pause or frames drop | Run solver logic off main render cycle (web worker or async chunking), cache pruning tables, throttle button presses. |
| Complex algorithm bugs | Incorrect solutions frustrate users | Add exhaustive tests, cross-validate with known solver libraries, expose debug mode logging sequences. |
| User expectation mismatch | Users expect instant solve or educational steps | Provide progress indicator, optional slow/fast toggle, document behavior in UI tooltip. |
| Animation backlog grows | Long sequences delay manual control | Allow cancel/skip, limit maximum automated moves, display ETA. |
| Reverting to solved state mid-animation | State desync | Lock new solver invocations until queue empty, or implement safe drain before injecting solver moves. |
| Memory footprint (lookup tables) | Larger bundles | Lazy-load solver module, use dynamic import when user opens controls, compress tables. |

## Rollout Checklist
- UI: auto-solve button styled with existing control overlay, includes disabled/loading states and optional progress text.
- Solver module: documented API, unit tests, dynamic import if needed.
- Analytics: events for start, success, cancel, error with move counts and duration.
- Accessibility: keyboard shortcut, focus order updates, aria-labels.
- Documentation: update `docs/PROJECT_OVERVIEW.md` or README with feature description and troubleshooting tips.
- Fail-safe: allow reverting to `createInitialState()` if solver throws; show toast/error message.
- QA sign-off: manual test matrix covering desktop/mobile, slow devices, repeated scrambles.
- Release comms: changelog entry, feature flag rollout plan if staged deployment is used.
