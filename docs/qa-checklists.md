# QA Checklists

## Auto-Solve Feature — Manual QA Checklist

Use this checklist before shipping any change to the auto-solve button, cancel flow, or solver module.

---

### 1. UI States

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1.1 | Load the app with an unscrambled cube. | "Auto Solve" button is visible and enabled (blue, not faded). | |
| 1.2 | Click Shuffle and wait for animation to finish. | "Auto Solve" button remains enabled after queue drains. | |
| 1.3 | Click "Auto Solve" on an idle (solved) cube. | Toast "Cube solved in 0 moves!" appears and disappears after ~3 s; button returns to idle state. | |
| 1.4 | Shuffle the cube (wait for completion), then click "Auto Solve". | Button label changes to "Solving… ↻", a red "Cancel" button appears, Shuffle button becomes disabled. | |
| 1.5 | While solving is in progress, check the Controls legend. | "Auto-solve running" status chip is visible at the bottom of the legend. | |
| 1.6 | Allow the solve to complete normally (0 moves for now — algorithm stubs). | Toast "Cube solved in 0 moves!" shown; controls re-enabled; "Auto Solve" button returns; legend chip disappears. | |

---

### 2. Cancel Flow

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 2.1 | Start a solve (with actual moves enqueued once algorithm is implemented), then press Cancel immediately. | "Solving…" and "Cancel" disappear; "Auto Solve" button returns; Shuffle re-enables. | |
| 2.2 | Check that no further cube animation runs after cancel. | Cube animation stops at the current face position; no queued solver move continues. | |
| 2.3 | After cancel, press keyboard keys (e.g., R key). | Manual moves enqueue and animate normally. | |
| 2.4 | After cancel, press Shuffle. | Shuffle generates new random moves and animates correctly. | |
| 2.5 | After cancel, click "Auto Solve" again. | New solve session starts; no stale state from previous session interferes. | |

---

### 3. Busy Guard

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 3.1 | Click Shuffle. While shuffle animation is running, click "Auto Solve". | Tooltip "Finish current moves first" appears near the button; solver does not start. | |
| 3.2 | Press keyboard keys rapidly to fill the queue, then click "Auto Solve". | Same busy tooltip; solver does not start. | |
| 3.3 | Spam-click "Auto Solve" multiple times on an idle cube. | Only one solve session starts; no duplicate sessions or doubled queue entries. | |

---

### 4. Keyboard Locking

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 4.1 | While `isSolverLocked = true` (solver running), press R, U, F keys. | No cube moves enqueue; keyboard input is fully suppressed. | |
| 4.2 | After cancel or completion, press R key. | Move enqueues and animates correctly; solver lock is lifted. | |

---

### 5. Telemetry / Logging

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 5.1 | Open browser DevTools console. Click "Auto Solve". | `[telemetry] auto_solve_start { sessionId, scrambleLength, algorithm: 'beginner-layer' }` logged. | |
| 5.2 | Let solve complete. | `[telemetry] auto_solve_complete { sessionId, moveCount: 0, durationMs }` logged. | |
| 5.3 | Start a solve (when algorithm produces moves), then click Cancel. | `[telemetry] auto_solve_cancel { sessionId, remainingMoves }` logged. | |
| 5.4 | (Future) Force solver error via dev toggle. | `[telemetry] auto_solve_error { reason, scrambleLength }` logged; error toast visible. | |

---

### 6. Build and Test Checks

| # | Check | Command | Expected |
|---|-------|---------|----------|
| 6.1 | TypeScript no errors | `npx tsc --noEmit` | Exit 0, no errors |
| 6.2 | All unit tests pass | `npx vitest run` | All tests pass (≥ 98 tests) |
| 6.3 | Production build | `npm run build` | Exit 0, no errors or warnings |
| 6.4 | T10 auto-solve logic tests | `npx vitest run src/utils/__tests__/autoSolve.test.ts` | 23 tests pass |
| 6.5 | T11 cancel regression tests | `npx vitest run src/utils/__tests__/moveQueueCancel.test.ts` | 20 tests pass |

---

### 7. Performance / Stress

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 7.1 | (Future — once algorithm is implemented) Run a 20-move scramble then auto-solve on desktop. | Solve completes under 30 s; no animation jitter. | |
| 7.2 | (Future) Run a 20-move scramble then auto-solve on mobile Safari. | Same smoothness; no layout shifts; touch/orbit controls still usable during solve. | |
| 7.3 | (Future) Stress test: cancel/start 10 times rapidly. | No locked UI, no duplicate sessions, no leftover queue moves. | |

---

### 8. Accessibility

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 8.1 | Tab to "Auto Solve" button. | Visible focus ring; Enter/Space activates it. | |
| 8.2 | Tab to "Cancel" button while solving. | Visible focus ring; Enter/Space fires cancel. | |
| 8.3 | Use screen reader (VoiceOver/NVDA) and click "Auto Solve". | Button state announced; status changes communicated. | |
| 8.4 | Verify `disabled` attribute on Shuffle and Auto Solve when locked. | Assistive technology does not activate disabled buttons. | |

---

### 9. Known Limitations (as of Phase 3)

- The solver algorithm (cross/F2L/OLL/PLL macro bodies) is not yet implemented. Auto Solve will complete immediately with 0 moves for any scrambled state.
- Telemetry is a `console.info` stub — no remote analytics yet.
- No speed multiplier for long solve sequences (planned as future work).
- `aria-live` announcements for solve completion/cancel have not been audited against all screen readers.
