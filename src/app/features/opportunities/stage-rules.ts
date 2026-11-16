import { OPPORTUNITY_STAGES, OpportunityStage } from '../../core/opportunities.models';

const isClosed = (stage: string) => stage === 'Closed Won' || stage === 'Closed Lost';

/** Both closed stages share the last position, as in the API (OpportunityStages.Position). */
function position(stage: string): number {
  if (isClosed(stage)) return OPPORTUNITY_STAGES.length - 2;
  const index = OPPORTUNITY_STAGES.indexOf(stage as OpportunityStage);
  return index < 0 ? 0 : index;
}

/**
 * The stages an opportunity can move to (BR-OP-004, ADR-010): forward any number of stages,
 * including straight to Closed Won or Closed Lost, or back one stage; a closed opportunity is
 * final. Mirrors the API, which still checks every change.
 */
export function nextStages(current: string): OpportunityStage[] {
  if (isClosed(current)) return [];
  const from = position(current);
  return OPPORTUNITY_STAGES.filter((s) => s !== current && position(s) - from >= -1);
}
