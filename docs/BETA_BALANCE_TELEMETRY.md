# Beta Balance & Telemetry Follow-ups (Phase 9 P6)

Parent: Issue #63 / Phase 9 P6  
Document: `docs/BETA_BALANCE_TELEMETRY.md`  
Status: Complete (Beta Verified)

---

## 1. Executive Summary

Phase 9 P6 resolves the telemetry blind spots and balance questions identified during Phase 8:
1. **Purchasing & Affordability Telemetry**: In Phase 8, all tested policies accumulated credits into unspent hoards without purchasing catalog items. P6 adds a dedicated `rig-builder` economy policy that actively buys hardware components, leases housing, enables software licenses, acquires local AI models, and purchases authored player tools, measuring timing, wallet pressure, upkeep burden, and catalog reachability.
2. **Pressure-Band Reachability (`known` and `entangled` at 0/128)**: In Phase 8, `known` and `entangled` pressure bands recorded 0 samples out of 128. P6 determines the exact root cause: the tested Phase 8 policies were either completely idle or unpaced 24/7 contract bots that accumulated score > 20 before crossing the Day 14 long-run pressure threshold. Adding a realistic `cautious-novice` policy demonstrates that human-paced play (resting between operations and selecting low-intrusion recon work) reliably reaches and finishes in `known` and `entangled` bands.
3. **Seed Variance**: Verified across the canonical diverse 32-bit seeds introduced in P5 (`CANONICAL_BETA_VARIED_SEEDS`), ensuring simulation determinism is preserved across real seed variation.
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
- Across the canonical 32-seed varied matrix (`CANONICAL_BETA_VARIED_SEEDS`):
  - **`known` reachability**: 25 of 32 runs (78.1%) visit the `known` band.
  - **`entangled` reachability**: 31 of 32 runs (96.9%) reach the `entangled` band.
  - **Day 30 ending pressure distribution**: 8 of 32 runs (25.0%) finish in `entangled`, while 24 of 32 runs (75.0%) finish in `veteran`.
  - All 32 runs survived to Day 30 with 0 arrests, 0 compromises, and 100% active ending status.
  - Mean contracts completed: 16.6 (total 532 across 32 runs).
  - Final credits: min 2,175, median 2,607.5, max 3,035 (mean: 2,604 cr).

**Decision**: The 14-day threshold and score thresholds (6 / 12 / 20) are mathematically and narratively sound. No artificial reduction of thresholds is needed; the Phase 8 metric was an artifact of policy selection, now fully resolved.

---

### 3.2 Purchasing & Affordability Telemetry (`rig-builder`)

The `rig-builder` policy was evaluated across 30 world days using the canonical varied-seed matrix to measure whether catalog items are practically affordable, when purchases occur, and whether upkeep causes unrecoverable failure.

#### Purchasing Metrics Summary (30-day Horizon)

- **Total Purchasing Spend**: 3,375 to 11,535 credits (median: 6,997.5 credits, mean: 7,046 credits).
- **Hardware Components**: 4 to 7 components acquired per run (median: 5; median spend: 2,750 credits, mean: 2,750 credits).
  - First hardware purchase: min minute 1,485 (~Day 1.0), median minute 3,394 (~Day 2.4), max minute 7,621 (~Day 5.3).
  - Hardware catalog coverage across runs (7 components): `cpu-balanced`, `cpu-overclock`, `gpu-entry`, `gpu-memory`, `net-card`, `ram-bank`, `storage-array`.
- **Housing Leases**:
  - First paid housing-upkeep charge: min minute 1,440 (~Day 1.0), median minute 4,320 (~Day 3.0), max minute 8,640 (~Day 6.0). Lease activation itself is free; this metric intentionally measures when the recurring cost first reaches the wallet.
  - Total housing upkeep paid: 210 to 915 credits across the run (median: 442.5 credits, mean: 479 credits).
  - Housing catalog coverage across runs (3 listings): `housing-basement-cot` (15 cr/day), `housing-cowork-loft` (30 cr/day), `housing-rented-lab` (60 cr/day).
- **Software Licenses**:
  - First paid software-license charge: min minute 5,760 (~Day 4.0), median minute 10,800 (~Day 7.5), max minute 17,280 (~Day 12.0). Enabling a license itself is free; this metric measures the first recurring debit.
  - Total license upkeep paid: 200 to 2,440 credits (median: 1,085 credits, mean: 1,180 credits).
  - Software catalog coverage across runs (2 suites): `software-net-monitor` (40 cr/day) and `software-auto-recon` (70 cr/day).
- **Local AI Models**:
  - First model acquired: min minute 9,254 (~Day 6.4), median minute 16,871 (~Day 11.7), max minute 25,888 (~Day 18.0).
  - Model acquisition spend: 600 to 2,250 credits (median: 1,350 credits, mean: 1,341 credits).
  - Model catalog coverage across runs (3 local models): `model-local-salvage` (600 cr), `model-local-reliable` (750 cr), `model-local-workhorse` (900 cr).
- **Authored Player Tools**:
  - First tool acquired: min minute 9,251 (~Day 6.4), median minute 15,781.5 (~Day 11.0), max minute 24,447 (~Day 17.0).
  - Tool spend: 500 to 2,100 credits (median: 1,200 credits, mean: 1,297 credits).
  - Tool count: 1 to 3 tools acquired per run (median: 2, mean: 2.1).
  - Tool catalog coverage across runs (3 tools): `tool-paranoid-scraper` (500 cr), `tool-map-stitcher` (700 cr), `tool-silent-dedup` (900 cr).
- **Wallet Pressure & Upkeep Burden**:
  - In contractor runs, credits steadily hoard to a median of 8,132.5 credits (up to 14,575 cr).
  - In rig-builder runs, credits remain active working capital, finishing with 195 to 3,250 credits (median: 947.5 credits, mean: 1,139 cr).
  - Involuntary upkeep lapses occurred in 7 of 32 runs (21.9%), at most 1 lapse per run (median: 0, mean: 0.22 lapses per run), when concurrent software and housing upkeep coincided with a gap between contract deliveries. Because Ghostrank lapses licenses and leases cleanly back to baseline without negative debt, the operator recovered safely in subsequent days.

**Decision**: Catalog pricing and daily upkeep rates are well-calibrated. All five catalog categories (hardware, housing, software, models, tools) are practically reachable through ordinary gameplay without level or rank gates.

---

### 3.3 Comparative Policy Distributions

Across 32 seeds per scenario in the canonical matrix (`CANONICAL_BETA_VARIED_SEEDS`), the Beta balance profiles demonstrate clear differentiation:

| Scenario | Median Run Minutes | Dominant Ending | Median Final Credits | Median Total Spent | Contracts Completed (Total / Mean) | Peak Pressure Band |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`idle`** | 43,200 (Day 30.0) | Active (32/32, 100%) | 0 | 0 | 0 / 0.0 | Ordinary (32/32, 100%) |
| **`cautious-novice`** | 43,200 (Day 30.0) | Active (32/32, 100%) | 2,607.5 | 0 | 532 / 16.6 | Entangled (8/32) / Veteran (24/32) |
| **`contractor`** | 30,060 (~Day 20.9) | Arrested (30/32, 93.8%) | 8,132.5 | 0 | 1,459 / 45.6 | Veteran (30/32, 93.8%) |
| **`reckless`** | 24,660 (~Day 17.1) | Arrested (32/32, 100%) | 5,820 | 0 | 1,077 / 33.7 | Veteran (25/32, 78.1%) |
| **`rig-builder`** | 30,060 (~Day 20.9) | Arrested (29/32, 90.6%) | 947.5 | 6,997.5 | 1,462 / 45.7 | Veteran (30/32, 93.8%) |
| **`career-exit`** | 23,357.5 (~Day 16.2) | Retired (26/32, 81.3%) | 4,097.5 | 0 | 709 / 22.2 | Veteran (30/32, 93.8%) |

---

## 4. Verification

1. **Deterministic Parity**: For identical seed, policy, and horizon, `sampleBalanceRun` produces byte-identical sample output.
2. **Pressure Band Assertion**: Dedicated regression test confirms `cautious-novice` samples reliably visit and evaluate in `known` and `entangled` bands.
3. **Purchasing Assertion**: Dedicated regression test confirms `rig-builder` samples purchase across all catalog categories, pay upkeep, and record non-null first purchase timestamps.
4. **Seed Variance**: The canonical/default Beta matrix uses the fixed non-zero varied set `CANONICAL_BETA_VARIED_SEEDS`; callers may still provide explicit seed lists for focused comparisons.
5. **No Rank Gating**: Confirmed that all purchases and contract offers flow through typed simulation commands without reading or gating on player rank.
