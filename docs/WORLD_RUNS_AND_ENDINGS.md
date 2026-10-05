# World, Runs, and Endings

## The underground ecosystem

Ghostrank simulates a community of anonymous handles, groups, markets, tools, contracts, rumors, rivalries, and shared norms.

Everyone can potentially target everyone else.

Actors vary by:
- skill,
- information,
- resources,
- tools,
- habits,
- relationships,
- objectives,
- risk tolerance,
- physical backing,
- mistakes.

Rank summarizes reputation/visibility but never fully describes danger.

## NPC autonomy

NPCs can:
- accept contracts,
- attack one another,
- attack the player,
- investigate rumors,
- buy/sell tools,
- change infrastructure,
- disappear,
- betray contacts,
- form or leave groups,
- react to public incidents,
- place bounties,
- retaliate.

The world should create stories without requiring the player to touch every event.

## Physical danger

The player's online identity is connected to a real person in a small physical location.

Threat can cross that boundary.

Signals include:
- a strange vehicle,
- footsteps,
- a knock,
- an unknown call,
- door-camera motion,
- an outage,
- unusual local connectivity,
- a delivery the player did not expect,
- nearby activity.

The game should avoid explicit countdown warnings when ambiguity is more effective.

## Locations

The physical world is intentionally compact.

Potential location archetypes:
- tiny rented studio,
- shared apartment,
- motel room,
- basement,
- workshop,
- short-term safehouse,
- rural house,
- high-end apartment.

Locations can differ in:
- cost,
- anonymity,
- power,
- connectivity,
- cooling,
- space,
- security,
- ease of relocation.

The player does not free-roam through a city. Leaving or relocating is handled through contextual actions and transitions.

## The avatar

The player may appear as a simple hooded or otherwise anonymous figure.

The face does not need to be shown.

Core physical animations can remain small:
- idle,
- walk,
- sit,
- type,
- stand,
- sleep,
- inspect hardware,
- pack/leave.

The goal is atmosphere and embodiment, not character-action gameplay.

## Terminal contract

Phase 7 uses one simulation-owned terminal transition for every ending. A live run has no ending record. Once an ending is recorded, the first final status is immutable and gameplay commands no longer advance or mutate that run. The UI reflects this state; it does not create it.

P0 establishes the contract only. Which histories qualify for arrested, unmasked, missing, compromised, stranded, retirement, or VANISHED are implemented by later Phase 7 slices.

## Run endings

Possible endings include:

### Arrested
An investigation reaches the person behind the handle.

### Unmasked
Identity is exposed enough that the current life/handle cannot continue.

### Captured / Killed / Missing
The player antagonized actors who can reach the physical world.

### Compromised
Infrastructure, identities, or systems are catastrophically lost.

### Broke / Stranded
The player lacks the resources to continue safely.

### Forced disappearance
The handle is abandoned under pressure without a clean exit.

### Voluntary retirement
The player intentionally plans an exit while still capable of continuing.


### Shipped forced-ending mapping (Phase 7 P1)

The first forced-ending policy consumes Phase 6 causal history rather than a
generic death roll:

- **ARRESTED** — a current identity-exposure condition cites an authority file
  whose player-visible evidence has already reached the converging band.
- **UNMASKED** — current identity exposure follows a physical actor who had
  already performed the underground's unmasking retaliation.
- **MISSING** — current physical identity exposure without either stronger
  authority/social history above.
- **STRANDED** — P4 has already proved the explicit resource floor.
- **COMPROMISED** — rig and dwelling are both lost on the same current boundary.

A rig loss or dwelling loss by itself is severe but recoverable. Rank never
selects an ending. Historical Phase 6 compromise records are not retroactively
terminalized when loaded under Phase 7.

## Exit plan

Retirement is an operation, not a menu button.

It may involve:
- ending obligations,
- resolving dangerous relationships,
- winding down infrastructure,
- abandoning identities,
- redirecting legitimate/constructive assets,
- leaving a location,
- deciding what to do with sensitive information,
- surviving long enough for the trail to cool.

Exact mechanics remain fictionalized rather than representing real evasion procedures.

### Shipped voluntary exit operation (Phase 7 P2)

Retirement now has an explicit world-time process:

1. **PLAN EXIT** records intent but leaves normal play live.
2. The player winds down only visible obligations: active operation, accepted
   contracts, in-flight builds, running model, active software licenses, and the
   current lease.
3. **COMMIT EXIT** is unavailable until that checklist is clear. A blocked
   commit costs no time.
4. A clean commit spends one world hour while the normal world keeps acting.
   Forced endings can interrupt this hour.
5. Success freezes a two-world-day cooling deadline. During cooling the player
   may wait, read messages, or cancel the exit and return to normal play.
6. Crossing the cooling deadline produces a derived **READY** state, not an
   ending. Phase 7 P3 chooses the retirement outcome from actual history.

Rank and hidden danger are not exit-plan gates. The system models abstract
fictional wind-down only; it contains no real identity/evasion procedure.


### Shipped retirement outcomes (Phase 7 P3)

READY becomes terminal only when the player explicitly closes the handle
(`retire finish` / **CLOSE HANDLE**). The finish action costs no additional
world time and uses the shared D037 terminal transition.

The outcome is derived from completed run history, not the selected starting
board and not rank:

- **VANISHED** requires at least three completed White-network contracts, zero
  completed Black-network contracts, no missed accepted obligation
  (`Opportunist`), no repeated-escalation history (`Predator`), no
  catastrophic compromise, and no social unmasking.
- **RETIRED // white-quiet** covers White-leaning completed-work history that
  does not satisfy the stricter VANISHED contract.
- **RETIRED // black-prosperous** covers Black-dominant completed work with
  money left and no pressure history.
- **RETIRED // black-watchful** covers Black-dominant history that still carries
  retaliation, physical-threat, or compromise history.
- **RETIRED // black-quiet** covers the remaining Black-dominant exits.
- **RETIRED // mixed-exit** covers histories without a clear completed-work
  majority.

A Black-starting run can therefore earn VANISHED through its actual history,
and a White-starting run can end with a Black retirement tone. These labels
summarize the fictional run; they are not a real-world disappearance/evasion
procedure.

## Rare White happy ending

A White-leaning run that stayed consistent with its code can earn a genuinely peaceful ending.

The closing montage can show:
- victims or communities benefiting,
- constructive projects receiving support,
- the old handle going silent,
- former contacts wondering what happened,
- the player living quietly in a beautiful remote place.

An old device may receive one final message. The player sees it, chooses not to reopen that life, and puts the device away.

Final status:

**VANISHED**

The point is not that crime became morally clean. The ending recognizes a character who targeted harmful actors, limited collateral harm, used the run's gains constructively, and successfully stopped.

## Black retirement

A Black-leaning player may also retire with wealth and freedom.

The tone can differ:
- more luxury,
- more unresolved enemies,
- stronger security,
- frequent relocation,
- inability to fully stop watching the door.

They may have escaped the system without escaping the psychological cost.

## Run summary

A final report can include:
- days survived,
- peak rank,
- money/value moved,
- major operations,
- hackers defeated,
- tools authored,
- times compromised,
- relationships,
- reputation descriptors,
- final cause/status.

The summary supports storytelling; it is not a single numerical score.

### Shipped completed-run history (Phase 7 P4)

On the web, a completed run is now moved out of the active save slot into local
IndexedDB history as the **same final authoritative WorldState**. The archive
does not store a second scorecard or alternate ending model.

The GHOST/OS **History** app derives a read-only summary from each archived run,
newest-first. The shipped summary currently includes:

- final ending status and time;
- retirement variant/detail when relevant;
- final rank (not an invented peak rank);
- credits left and lifetime ledger value moved;
- completed contracts;
- intrusive operation escalations;
- authored workflows;
- compromise count;
- derived reputation descriptors;
- the existing player-safe compromise postmortems.

Hidden ending cause ids, relationship numbers, probe correctness,
investigation progress/source ids, and other private simulation truth do not
enter the history read model. Browsing an archived run has no command surface
and cannot mutate either the archive or the current run.

A failed browser archive never revives play: the terminal snapshot remains
durable for boot recovery. After a successful active→history move, a later boot
creates a fresh active run separately. Native SQLite/Tauri completed-history
parity remains deferred to #19.

