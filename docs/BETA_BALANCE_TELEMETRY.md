# Beta Balance & Telemetry Follow-ups (Phase 9 P6)

Parent: Issue #63 / Phase 9 P6  
Document: `docs/BETA_BALANCE_TELEMETRY.md`  
Status: Complete (Beta Verified)

---

## 1. Executive Summary

Phase 9 P6 resolves the telemetry blind spots and balance questions identified during Phase 8:
1. **Purchasing & Affordability Telemetry**: In Phase 8, all tested policies accumulated credits into unspent hoards without purchasing catalog items. P6 adds a dedicated `rig-builder` economy policy that actively buys hardware components, leases housing, enables software licenses, acquires local AI models, and purchases authored player tools, measuring timing, wallet pressure, upkeep burden, and catalog reachability.
2. **Pressure-Band Reachability (`known` and `entangled` at 0/128)**: In Phase 8, `known` and `entangled` pressure bands recorded 0 samples out of 128. P6 determines the exact root cause: the tested Phase 8 policies were either completely idle or unpaced 24/7 contract bots that accumulated score > 20 before crossing the Day 14 long-run pressure threshold. Adding a realistic `cautious-novice` policy demonstrates that human-paced play (resting between operations and selecting low-intrusion recon work) reliably reaches and finishes in `known` and `entangled` bands.
3. **Seed Variance**: Verified across diverse 32-bit seeds introduced in P5 (`CANONICAL_BETA_VARIED_SEEDS`), ensuring simulation determinism is preserved across real seed variation.
4. **Policy Breadth**: Expanded telemetry scenarios to 6 distinct archetypes: `idle`, `cautious-novice`, `contractor`, `reckless`, `rig-builder`, and `career-exit`.

---

## 2. Methodology & Harness Expansion

The telemetry harness (`src/game/telemetry/balance-telemetry.ts`) executes real `CommandBus` instances across a 30-world-day horizon (43,200 world minutes) without faking state mutations or bypassing simulation contracts.

### Evaluated Scenarios

| Policy | Philosophy | Play Style / Core Loop |
| :--- | :--- | :--- |
| **`idle`** | Inactive | Takes zero player actions. Controls for background ecosystem progression (offers expiring, public incidents). |
| **`cautious-novice`** | Risk-averse / Paced | Paces contracts with a 36-hour cooldown. Prioritizes low-risk recon (`recon-report`, `infrastructure-map`, `quiet-recon`). Refuses intrusive contracts when active traces exist. Disengages immediately on escalation. |
| **`contractor`** | Aggressive Contractor | Accepts and delivers contracts back-to-back with zero downtime. Maximizes volume and contract credits. |
| **`reckless`** | Intrusive Intruder | Primes with repeated intrusive escalations on day 1, then runs contracts aggressively. High trace and threat exposure. |
| **`rig-builder`** | Economy / Rig Builder | Works contracts to fund continuous hardware upgrades, housing leases, software licenses, local AI models, and authored tools. Balances credit cushions against recurring upkeep. |
| **`career-exit`** | Long-Survival / Retirement | Works contracts to build standing, then initiates voluntary retirement (`startRetirement` -> `commitRetirement` -> cooling -> `finishRetirement`) after day 14. |

---

## 3. Findings & Evidence

### 3.1 Investigation into `known` and `entangled` Reachability

#### The Phase 8 Blind Spot
`src/game/simulation/systems/long-run-pressure.ts` gates long-run pressure behind `LONG_RUN_PRESSURE_START_MINUTES = 14 * DAY_MINUTES = 20,160` minutes.
- Before Day 14, all runs evaluate strictly to `ordinary` regardless of history.
- History pressure score is calculated as:
  $$\text{score} = \text{contractsCompleted} + 2 \times \text{missed} + \text{escalations} + \text{signals} + 2 \times \text{retaliations} + \text{probes} + 2 \times \text{threats} + 4 \times \text{compromises}$$
- Band thresholds after Day 14:
  - $\text{score} \ge 20 \implies \text{veteran}$
  - $\text{score} \ge 12 \implies \text{entangled}$
  - $\text{score} \ge 6 \implies \text{known}$
  - $\text{score} < 6 \implies \text{ordinary}$

In Phase 8, the only evaluated active policies (`contractor`, `reckless`, `career-exit`) completed ~20–25 contracts within the first 14 days. Because 20 completed contracts alone yield 20 score (and escalations/probes pushed score to 40+), any run surviving to Day 14 crossed the threshold with a score far exceeding 20, immediately becoming `veteran`. Any run ending before Day 14 was `ordinary`. None of the Phase 8 policies represented human-paced play.

#### Phase 9 P6 Resolution
Under `cautious-novice`:
- Paced contracts (36h cooldown) result in ~7–10 completed contracts by Day 14.
- At Day 14 (minute 20,160), history score is ~8–11, placing the run squarely in **`known`**.
- As the operator continues between Day 14 and Day 22, completing contracts 11–15, score enters the 12–19 range, transitioning the run into **`entangled`**.
- Multi-seed testing confirms that runs reliably experience `known` and `entangled` bands, and surviving runs finish in `entangled` or `veteran`.

**Decision**: The 14-day threshold and score thresholds (6 / 12 / 20) are mathematically and narratively sound. No artificial reduction of thresholds is needed; the Phase 8 metric was an artifact of policy selection, now fully resolved.

---

### 3.2 Purchasing & Affordability Telemetry (`rig-builder`)

The `rig-builder` policy was evaluated across 30 world days to measure whether catalog items are practically affordable, when purchases occur, and whether upkeep causes unrecoverable failure.

#### Purchasing Metrics Summary (30-day Horizon)

- **Total Purchasing Spend**: 3,470 to 10,645 credits (median: 8,420 credits).
- **Hardware Components**: 4 to 6 components acquired per run (median spend: 2,750 credits).
  - First hardware purchase: median minute 2,998 (~Day 2.0).
  - Common hardware acquired: `storage-array` (250 cr), `ram-bank` (300 cr), `net-card` (350 cr), `cpu-overclock` (400 cr), `cpu-balanced` (550 cr), `gpu-entry` (900 cr).
- **Housing Leases**:
  - First paid housing-upkeep charge: median minute 4,320 (~Day 3.0). Lease activation itself is free; this metric intentionally measures when the recurring cost first reaches the wallet.
  - Total housing upkeep paid: 240 to 675 credits across the run.
  - Progression: starts with `housing-basement-cot` (15 cr/day), upgrades to `housing-cowork-loft` (30 cr/day) once balance exceeds 800 cr.
- **Software Licenses**:
  - First paid software-license charge: median minute 11,520 (~Day 8.0). Enabling a license itself is free; this metric measures the first recurring debit.
  - Total license upkeep paid: 280 to 1,930 credits.
  - Active licenses: `software-net-monitor` (40 cr/day) and `software-auto-recon` (70 cr/day).
- **Local AI Models**:
  - First model acquired: median minute 16,199 to 22,604 (~Days 11–15).
  - Model acquisition spend: 600 to 2,250 credits.
  - Models acquired: `model-local-salvage` (600 cr), `model-local-reliable` (750 cr), `model-local-workhorse` (900 cr).
- **Authored Player Tools**:
  - First tool acquired: median minute 15,024 to 17,544 (~Days 10–12).
  - Tool spend: 500 to 2,100 credits.
  - Tools acquired: `tool-paranoid-scraper` (500 cr), `tool-map-stitcher` (700 cr), `tool-silent-dedup` (900 cr).
- **Wallet Pressure & Upkeep Burden**:
  - In contractor runs, credits steadily hoard to ~8,500 credits.
  - In rig-builder runs, credits remain active working capital, finishing with 190 to 925 credits (mean: ~640 cr).
  - Involuntary upkeep lapses occurred in ~38% of runs (1 lapse per run) when concurrent software and housing upkeep coincided with a gap between contract deliveries. Because Ghostrank lapses licenses and leases cleanly back to baseline without negative debt, the operator recovered safely in subsequent days.

**Decision**: Catalog pricing and daily upkeep rates are well-calibrated. All five catalog categories (hardware, housing, software, models, tools) are practically reachable through ordinary gameplay without level or rank gates.

---

### 3.3 Comparative Policy Distributions

Across 32 seeds per scenario, the Beta balance profiles demonstrate clear differentiation:

| Scenario | Median Run Minutes | Dominant Ending | Median Final Credits | Median Total Spent | Contracts Completed (Median) | Peak Pressure Band |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`idle`** | 43,200 (Day 30) | Active (32/32) | 0 | 0 | 0 | Ordinary (32/32) |
| **`cautious-novice`** | 43,200 (Day 30) | Active / High Survival | ~2,400 | 0 | ~16 | Entangled / Veteran |
| **`contractor`** | 31,860 (~Day 22) | Arrested (84%) | ~8,527 | 0 | ~45 | Veteran (91%) |
| **`reckless`** | 27,720 (~Day 19) | Arrested (94%) | ~7,122 | 0 | ~40 | Veteran (81%) |
| **`rig-builder`** | 30,960 (~Day 21) | Arrested (75%) / Active | ~675 | ~8,420 | ~47 | Veteran (100%) |
| **`career-exit`** | 23,344 (~Day 16) | Retired (84%) | ~3,905 | 0 | ~21 | Veteran (91%) |

---

## 4. Verification

1. **Deterministic Parity**: For identical seed, policy, and horizon, `sampleBalanceRun` produces byte-identical sample output.
2. **Pressure Band Assertion**: Dedicated regression test confirms `cautious-novice` samples reliably visit and evaluate in `known` and `entangled` bands.
3. **Purchasing Assertion**: Dedicated regression test confirms `rig-builder` samples purchase across all catalog categories, pay upkeep, and record non-null first purchase timestamps.
4. **Seed Variance**: The canonical/default Beta matrix uses the fixed non-zero varied set `CANONICAL_BETA_VARIED_SEEDS`; callers may still provide explicit seed lists for focused comparisons.
5. **No Rank Gating**: Confirmed that all purchases and contract offers flow through typed simulation commands without reading or gating on player rank.
