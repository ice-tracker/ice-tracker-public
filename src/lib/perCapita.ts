// Per-capita rates for the DDP counts on the map's area card.
//
// Centralised for the same reason activityToIncidentType is (see
// src/constants/incident.ts): the threshold and the rounding rules are
// judgement calls, and a second copy of them would drift.
//
// Read the caveats before using this anywhere new. A DDP rate is NOT a
// residents-arrested-per-head figure:
//
//   * DDP records an arrest against the apprehension site (via
//     public/files/site_town_map.json) and a detainer against the holding
//     facility's city. A town with an ICE office, a courthouse or a detention
//     facility therefore absorbs counts for people who live somewhere else,
//     and its rate reads high against its own residents.
//   * The counts are filtered by the map's date range, so the denominator is
//     a population but the numerator is a window — the result is "per 100k
//     over the dates selected", never an annual rate.
//
// Both caveats are stated on the card whenever the toggle is on.

/** Rates are quoted per this many residents — the usual convention. */
export const PER_CAPITA_BASE = 100_000;

/**
 * Below this many residents a rate is suppressed rather than shown.
 *
 * Massachusetts has towns down to ~488 people, where a single arrest is 205
 * per 100k — a number driven entirely by the size of the denominator rather
 * than by anything about the town. Roughly a dozen municipalities fall under
 * this line.
 */
export const MIN_POPULATION_FOR_RATE = 1_000;

/**
 * `count` per PER_CAPITA_BASE residents, or null when no rate should be shown
 * — either the population is unknown (census fetch not landed, or no row for
 * this area) or it is too small to carry one.
 *
 * Returning null for both cases is deliberate: callers must handle "no rate"
 * anyway, and a 0 or NaN sentinel would render as a real-looking figure.
 */
export function perCapitaRate(
  count: number,
  population: number | undefined,
): number | null {
  if (typeof population !== "number" || !Number.isFinite(population)) return null;
  if (population < MIN_POPULATION_FOR_RATE) return null;
  return (count / population) * PER_CAPITA_BASE;
}

/**
 * Formats a rate for display, without the unit.
 *
 * Precision tracks magnitude so the number stays readable across the ~4 orders
 * of magnitude these rates span: Boston's 12 arrests are 1.8 per 100k, while a
 * small town hosting a facility can run into the hundreds.
 *
 * A nonzero rate below 0.1 becomes "<0.1" rather than rounding to "0.0", which
 * would claim there were no arrests when there were.
 */
export function formatPerCapitaRate(rate: number): string {
  if (rate === 0) return "0";
  if (rate < 0.1) return "<0.1";
  if (rate < 100) return rate.toFixed(1);
  return Math.round(rate).toLocaleString();
}
