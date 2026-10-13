// Shared constants/helpers for the post-Luce-migration incident model.
//
// The old free-form Activity taxonomy (Arrest / Attempted Arrest / Presence /
// vehicle stops / arbitrary free text) has been replaced by exactly two
// incident types: a Sighting, or an Abduction (which also carries a count of
// people taken). Every place in the app that used to branch on the old
// Activity strings should import from here instead of re-declaring literals.

export const INCIDENT_TYPES = {
  SIGHTING: "Sighting",
  ABDUCTION: "Abduction",
} as const;

export type IncidentType = (typeof INCIDENT_TYPES)[keyof typeof INCIDENT_TYPES];

export const INCIDENT_TYPE_OPTIONS: IncidentType[] = [
  INCIDENT_TYPES.SIGHTING,
  INCIDENT_TYPES.ABDUCTION,
];

/**
 * Luce's "Incident Description" column packs both the incident type and (for
 * abductions) the number of people taken into one string, e.g.:
 *   "Confirmed Sighting"      -> { activity: "Sighting", numAbducted: 0 }
 *   "Confirmed Abducted: 2"   -> { activity: "Abduction", numAbducted: 2 }
 *
 * Falls back to Sighting with a 0 count for anything unrecognized (including
 * empty/missing descriptions) rather than throwing, since bulk-upload rows
 * should degrade gracefully into the review table's invalid-row flow.
 */
export function parseIncidentDescription(
  description: string | null | undefined
): { activity: IncidentType; numAbducted: number } {
  const normalized = emptyToNull(description)?.trim().toLowerCase() ?? "";

  const abductedMatch = normalized.match(/abduct(?:ed|ion)?\s*:?\s*(\d+)/);
  if (abductedMatch) {
    return {
      activity: INCIDENT_TYPES.ABDUCTION,
      numAbducted: parseInt(abductedMatch[1], 10) || 0,
    };
  }

  if (normalized.includes("abduct")) {
    return { activity: INCIDENT_TYPES.ABDUCTION, numAbducted: 0 };
  }

  return { activity: INCIDENT_TYPES.SIGHTING, numAbducted: 0 };
}

/**
 * Bucket a stored `Activity` value into one of the two incident types.
 *
 * Unlike parseIncidentDescription (which reads Luce's combined "Incident
 * Description" cell), this takes the value already persisted in
 * Report.Activity and works for both the new vocabulary and every legacy
 * string still in the database:
 *
 *   Abduction <- "Abduction", "Arrest"
 *   Sighting  <- "Sighting", "Presence", "Attempted Arrest",
 *                "Vehicle Sighting", and anything unrecognized
 *
 * Legacy values are mapped forward rather than dropped, so aggregates stay
 * correct before, during and after the wipe-and-reload in
 * docs/luce-migration.md — the reload cannot be timed precisely, and rows are
 * read the whole time.
 *
 * Sighting is the fallback on purpose: it is the less severe classification,
 * so an unknown value can never inflate the abduction count. There is
 * deliberately no catch-all "Other" bucket — an unrecognized value landing in
 * a vague bucket is how abductions previously got counted as "Other".
 *
 * Callers that need per-bucket tallies should use this rather than re-deriving
 * the mapping; the map's area card and /api/luce-area-stats are separate
 * implementations of the same aggregate and previously drifted apart.
 */
export function activityToIncidentType(
  activity: string | null | undefined
): IncidentType {
  const a = (activity ?? "").toString().trim().toLowerCase();
  if (a === "abduction" || a === "arrest") return INCIDENT_TYPES.ABDUCTION;
  return INCIDENT_TYPES.SIGHTING;
}

/**
 * Location Type values that should trigger coordinate anonymization (see
 * isSensitiveLocation in src/lib/server/anonymization.ts). Kept here so the
 * vocabulary is defined once and can be reused by both server anonymization
 * logic and any client-side display code that needs to know a report is
 * sensitive before the server responds.
 */
export const SENSITIVE_LOCATION_TYPES = new Set([
  "home",
  "workplace",
  "apartment",
  "apartments",
  "residence",
  "residential",
]);

/**
 * Luce's sheet uses the literal string "(empty)" as a null sentinel instead
 * of leaving the cell blank. Normalizes that (and blank/whitespace-only
 * strings) to a real null.
 */
export function emptyToNull(
  value: string | null | undefined
): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "(empty)") return null;
  return trimmed;
}
