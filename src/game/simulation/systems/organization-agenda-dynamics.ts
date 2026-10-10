/**
 * G5 P0: response to observed WORLD AUTHORITY incidents, not public rumors.
 * The defender's members already consume agenda=defend in the ordinary NPC
 * combat system; brokers consume expand/undercut in contract offers.
 *
 * Called exactly once after actor incidents at each 360-world-minute boundary,
 * before that tick's contract offers. No RNG, rank, second scheduler or UI.
 */
import type { SimulationEvent } from "@/game/simulation/events/types";
import type {
  UndergroundIncident,
  UndergroundOrganization,
  WorldState,
} from "@/game/simulation/state/world-state";

/** Two quiet in-world days, separate from real wall time. */
export const ORGANIZATION_QUIET_RECOVERY_MINUTES = 48 * 60;

/** A genuine successful *rival* intrusion against infrastructure we own. */
function victimOfRivalBreach(
  world: WorldState,
  organization: UndergroundOrganization,
  incident: UndergroundIncident,
): boolean {
  if (incident.outcome !== "succeeded") return false;
  const attacker = world.underground.actors.find(a => a.id === incident.actorId);
  const defender = world.underground.actors.find(a => a.id === incident.counterpartId);
  return defender?.organizationId === organization.id &&
    attacker?.organizationId !== undefined &&
    organization.rivalIds.includes(attacker.organizationId);
}

export function advanceOrganizationAgendas(
  world: WorldState,
  worldMinute: number,
): SimulationEvent[] {
  // The event owner already prevents post-ending ticks; this extra guard
  // makes direct callers respect first-ending-wins as well.
  if (world.ending) return [];
  const orgs = world.underground.organizations;
  if (!orgs?.length) return [];
  const events: SimulationEvent[] = [];
  for (const org of orgs) {
    // New breaches are the only evidence that can CREATE or extend a response.
    // Delayed/stale historical records never create a new emergency on load.
    const freshBreach = world.underground.incidents.find(incident =>
      incident.worldMinute === worldMinute &&
      victimOfRivalBreach(world, org, incident));

    const response = org.organizationResponse;
    if (response) {
      if (freshBreach) {
        // Additional breach prolongs protection, without spawning a repeat event.
        response.lastBreachWorldMinute = worldMinute;
        response.causeIncidentId = freshBreach.id;
      } else if (
        worldMinute - response.triggeredWorldMinute >= ORGANIZATION_QUIET_RECOVERY_MINUTES &&
        worldMinute - response.lastBreachWorldMinute >= ORGANIZATION_QUIET_RECOVERY_MINUTES
      ) {
        org.agenda = response.previousAgenda;
        delete org.organizationResponse;
        events.push({
          type: "OrganizationAgendaShifted",
          organizationId: org.id,
          from: "defend", to: org.agenda,
          reason: "quiet-recovery",
          causeIncidentId: response.causeIncidentId,
          worldMinute,
        });
      }
      continue;
    }
    // An organization which started as a defender has nothing to restore.
    if (!freshBreach || org.agenda === "defend") continue;
    const previousAgenda = org.agenda;
    org.organizationResponse = {
      previousAgenda,
      triggeredWorldMinute: worldMinute,
      lastBreachWorldMinute: worldMinute,
      causeIncidentId: freshBreach.id,
    };
    org.agenda = "defend";
    events.push({
      type: "OrganizationAgendaShifted",
      organizationId: org.id,
      from: previousAgenda, to: "defend",
      reason: "rival-breach",
      causeIncidentId: freshBreach.id,
      worldMinute,
    });
  }
  return events;
}
