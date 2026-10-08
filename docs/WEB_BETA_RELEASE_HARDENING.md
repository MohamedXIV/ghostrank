# Ghostrank Web Beta Release Hardening

**Phase:** 9 P8 — Browser Performance + Web Release Hardening  
**Status:** Verification passed on `phase-9-p8-browser-release-hardening`; canonical PR is pending.  
**Verified source SHA:** `0f4ad1a1c926d5c01e0158e83ebd27c915ff12f8`  
**Baseline:** `f2c8eacaa09bc210e7b3fd5543647a4aa39ea051`

The verification SHA identifies the implementation tree used for the release gates and production smoke. This checklist and roadmap update are a documentation-only follow-up.

## Browser evidence

| Browser/device | Result | Notes |
| --- | --- | --- |
| Chromium desktop 151.0.7922.173 | Pass | Production static export, headless browser smoke. |
| Android Chromium emulation | Pass | Touch emulation at 393×873 CSS px, DPR 3; all six desktop apps opened by touch. This is not a physical Poco X3 test. |
| Firefox | Deferred | Firefox is not installed in the cloud environment. |
| Safari | Reviewed, not run | No Safari runtime is available here; no Safari pass is claimed. |
| Physical Poco X3 | Deferred | No physical Android device is attached. |

Production smoke covered explicit new-run initialization, room → computer → room, active-run reload, ended-run reload/history, recovery screens, six application windows, distro/theme changes, mute, reduced-motion modes, and touch layout. No application JavaScript exceptions occurred. A static-host request for `/favicon.ico` returns 404; it does not affect app loading or gameplay.

Safari code review covered IndexedDB v3 creation and transactions, guarded localStorage access, the `AudioContext` / `webkitAudioContext` fallback and optional audio failures, client-only dynamic Phaser import and teardown, modal focus listeners, reduced-motion queries, and CSS use of `:where()`, `color-mix()`, and `backdrop-filter`. These features target modern Safari; older Safari compatibility remains unverified.

## Performance and stress findings

The baseline mounted all 3,019 events in a completed History timeline. Under Chromium stress it produced 29,188 History subtree nodes, an approximately 662 ms open, and a 307 ms main-thread long task. History now renders the newest 100 events at a time, keeps the ending in view, and exposes older events in chronological pages. The same fixture mounted 758 History subtree nodes in 136 ms with no long task.

Window focus/open state previously rerendered every mounted app. The six data-bound app components now use `memo`, and the large Underground and Market projections memoize their sorted table-derived arrays. The room’s non-informative repeating window glow was removed; pointer zoom is disabled when reduced motion is effective.

The deterministic 60-day fixture contains 1,200 traces, 300 reactions, 1,800 rumors, 1,800 messages, 1,800 incidents, 900 contracts, 1,800 forum posts, 2,000 ledger entries, 96 observed machines, 768 investigation signals, 250 probes, 200 physical threats, 320 owned hardware items, 140 tools, 120 owned machines, and 60 owned workflows. Its active/completed portable-save payload is 5.26 MB, and its completed timeline contains 3,019 beats. Fixture assertions verify deterministic timeline order and that hidden truth fields are absent from player projections.

| Surface | Baseline stress | Verified after hardening |
| --- | --- | --- |
| Recon topology | 98 discovered machine nodes | Opened in ~211–224 ms; no long task. |
| Underground | 1,370 list rows, ~4,765 subtree nodes, 188 ms long task | 192 rows across bounded lists, 1,199 subtree nodes, ~289 ms open, one 53 ms task. Moving to the next set produced no long task. |
| Market | 730 list rows, ~4,097 subtree nodes, 201 ms long task | 185 rows across bounded lists, 1,332 subtree nodes, ~282 ms open, one 61 ms task. Moving to the next set produced no long task. |
| History | 3,019 events mounted together; 307 ms task | 100 events per page; 758 subtree nodes; no long task. |
| Terminal | 150 `help` commands / 304 output entries | No command-related long task. The ~75 seconds measured by the automation loop is input-driver overhead, not a representative command-latency measurement. |

Underground and Market retain every projected record through bounded sets of 25 entries per list. On this extreme fixture, opening either app still has an isolated 53–61 ms task; navigating sets stays below the long-task threshold. Showing records no longer expands every long list in one operation.

The final static export contains 29 files (2,957,901 bytes). Its 15 JavaScript/CSS chunks total 2,911,431 raw bytes and 775,341 gzip bytes. The largest JavaScript chunk is 1,369,388 bytes raw / 351,598 bytes gzip. The export directory is about 3.0 MB.

The baseline at `f2c8eacaa09bc210e7b3fd5543647a4aa39ea051` passed all four gates: 97 test files / 866 tests, typecheck, lint, and production build. Lint already had the same PostCSS warning. The baseline had 15 JavaScript/CSS chunks totaling 2,906,781 raw bytes / 774,019 gzip bytes, with a 3.0 MB static export.

## Persistence and recovery

Production-build Chromium checks passed for:

- Empty storage remains at **NO ACTIVE RUN** until the player explicitly starts an operation.
- A newly started active run survives reload with the same world minute.
- An ended active snapshot reloads as its original ending and moves to completed history.
- Starting a fresh run after an ending preserves the archived run; its 3,019-event postmortem remains available after reload.
- Corrupt content remains intact until the player chooses to archive it; the raw bytes are preserved before a fresh run is created.
- Future-version save content remains byte-for-byte unchanged while the recovery diagnostic is shown.
- Unavailable IndexedDB offers an explicitly volatile operation and does not claim that it persisted after reload.

## Accessibility and presentation boundaries

- `REDUCED`, `SYSTEM`, and `STANDARD` modes were exercised with Chromium’s reduced-motion preference enabled. `SYSTEM` follows the browser preference; `STANDARD` overrides it; `REDUCED` forces still presentation.
- The orientation dialog’s focus trap wrapped Tab from the final action to the first action; Escape closed the dialog. Modal key listeners are removed on cleanup.
- Ghost/OS, Lattice, Velvet, Daybreak, Petal Light, and Petal Night rendered readable Terminal text. Distro/theme and accessibility selections survived reload.
- Muting before distro transitions left the existing AudioContext count unchanged; mute prevents optional audio output. Visual cues remain available without audio.
- A presentation-only distro transition left world time at minute 0. Motion, room visuals, and audio do not advance `WorldState`.

## Verification gates

At the verified source SHA:

- `npm test` — **PASS**, 100 test files / 875 tests.
- `npm run typecheck` — **PASS**.
- `npm run lint` — **PASS**, with one pre-existing warning at `postcss.config.mjs:1:1` (`import/no-anonymous-default-export`).
- `npm run build` — **PASS**, Next.js 16.3.8 static export generated at `out/`.

No GitHub Actions were used.

## Remaining release limitations

- One-time Underground/Market opening on the synthetic 60-day stress fixture still has a 53–61 ms main-thread task; ordinary production smoke had no application errors, and paging the lists had no long task.
- Firefox, real Safari, and a physical Poco X3 were not available for runtime verification.
- The static host requests a missing `/favicon.ico` and logs a harmless 404.

## Phase 9 exit

P8 performance, persistence, accessibility, and production-smoke checks pass for the tested Chromium target. No planned gameplay or UI architecture remains after this slice. Phase 10 desktop host/distribution work remains explicitly deferred until the Phase 9 PR is merged.

**Issue access note:** GitHub issue #65 returned 404/forbidden from the cloud session. The supplied request and repository Phase 9 plan defined the verification scope.
