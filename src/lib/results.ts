/**
 * What the results page shows (HS-01–HS-07). Kept apart from the flow
 * module so the router guard on every page does not bundle the scoring;
 * the crisis gate is checked here exactly as before (K3, K5).
 */

import { isScreeningFinished, mustShowCrisis, type FlowState } from "./flow";
import { meetsPriorityThreshold, scoreDass21, type Dass21Result } from "./scoring";

export interface ResultsView {
  result: Dass21Result;
  /** "Prioritas" panel (PRD 9.2, HS-07, K5). */
  showPriorityPanel: boolean;
  /** Keep the help directory near the top (PRD 9.5). */
  showSupportFirst: boolean;
}

/** Everything the results page needs, or null when results are not available. */
export function resultsView(state: FlowState): ResultsView | null {
  if (!isScreeningFinished(state) || mustShowCrisis(state)) return null;
  const result = scoreDass21(state.answers);
  if (!result) return null;
  const showPriorityPanel = meetsPriorityThreshold(result);
  return {
    result,
    showPriorityPanel,
    showSupportFirst:
      showPriorityPanel || state.safetyEverPositive || (state.safetyAnswer ?? 0) > 0,
  };
}
