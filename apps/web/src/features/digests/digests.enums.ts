import {
  DIAGRAM_KINDS,
  diagramKindsEnumwaii,
  INTENT_SOURCES,
  intentSourcesEnumwaii,
  TEST_TIERS,
  testTiersEnumwaii,
} from '@chaff/common/enums/digest.enums';
import { Enumwaii } from '@chaff/enumwaii/enumwaii';

export const DIAGRAM_KIND_LABELS = diagramKindsEnumwaii.derive({
  [DIAGRAM_KINDS.FLOW]: 'Flow',
  [DIAGRAM_KINDS.STATE]: 'States',
  [DIAGRAM_KINDS.SEQUENCE]: 'Sequence',
  [DIAGRAM_KINDS.OWNERSHIP]: 'Ownership',
});

export const INTENT_SOURCE_LABELS = intentSourcesEnumwaii.derive({
  [INTENT_SOURCES.DOCUMENTED]: 'from the commits or MR',
  [INTENT_SOURCES.INFERRED]: 'inferred',
});

/** Whether the agent read the test; a digest never runs tests, so nothing reaches "passed". */
export const TEST_TIER_IS_READ = testTiersEnumwaii.derive({
  [TEST_TIERS.EXISTS]: false,
  [TEST_TIERS.INSPECTED]: true,
  [TEST_TIERS.PASSED]: true,
});

/** The model select's entries that are not a listed model: the agent's own default, or an id typed by hand. */
export const agentModelPicksEnumwaii = new Enumwaii('AgentModelPick', ['AGENT_DEFAULT', 'CUSTOM']);

export const AGENT_MODEL_PICKS = agentModelPicksEnumwaii.enum;
