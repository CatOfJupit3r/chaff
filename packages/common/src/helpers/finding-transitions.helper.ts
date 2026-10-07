import { FINDING_KINDS, FINDING_STATUSES } from '../enums/review.enums';
import type { FindingKind, FindingStatus } from '../enums/review.enums';

type TransitionTable = ReadonlyMap<FindingStatus, readonly FindingStatus[]>;

const { OPEN, FIX_PROPOSED, VERIFIED, REOPENED, ANSWERED, CLOSED, WITHDRAWN, UNMATCHED } = FINDING_STATUSES;

const CONCERN_TRANSITIONS: TransitionTable = new Map<FindingStatus, readonly FindingStatus[]>([
  [OPEN, [VERIFIED, WITHDRAWN]],
  [REOPENED, [VERIFIED, WITHDRAWN]],
  [FIX_PROPOSED, [VERIFIED, REOPENED, WITHDRAWN]],
  [UNMATCHED, [VERIFIED, REOPENED, WITHDRAWN]],
  [VERIFIED, [REOPENED]],
  [WITHDRAWN, [OPEN]],
]);

const QUESTION_TRANSITIONS: TransitionTable = new Map<FindingStatus, readonly FindingStatus[]>([
  [OPEN, [ANSWERED, CLOSED, WITHDRAWN]],
  [REOPENED, [ANSWERED, CLOSED, WITHDRAWN]],
  [UNMATCHED, [ANSWERED, CLOSED, WITHDRAWN]],
  [ANSWERED, [CLOSED, REOPENED, WITHDRAWN]],
  [CLOSED, [REOPENED]],
  [WITHDRAWN, [OPEN]],
]);

const NOTE_TRANSITIONS: TransitionTable = new Map<FindingStatus, readonly FindingStatus[]>([
  [OPEN, [WITHDRAWN]],
  [UNMATCHED, [WITHDRAWN]],
  [WITHDRAWN, [OPEN]],
]);

const TRANSITIONS = new Map<FindingKind, TransitionTable>([
  [FINDING_KINDS.CONCERN, CONCERN_TRANSITIONS],
  [FINDING_KINDS.QUESTION, QUESTION_TRANSITIONS],
  [FINDING_KINDS.NOTE, NOTE_TRANSITIONS],
]);

/**
 * The statuses the reviewer can move a finding to by hand. Fix proposed and Unmatched only follow from a
 * newer snapshot or an agent report; Verified, Answered and Closed only ever come from the reviewer.
 */
export function manualFindingStatuses(kind: FindingKind, status: FindingStatus): readonly FindingStatus[] {
  return TRANSITIONS.get(kind)?.get(status) ?? [];
}

export function canSetFindingStatus(kind: FindingKind, from: FindingStatus, to: FindingStatus) {
  return manualFindingStatuses(kind, from).includes(to);
}

const AGENT_CONCERN_TRANSITIONS: TransitionTable = new Map<FindingStatus, readonly FindingStatus[]>([
  [OPEN, [FIX_PROPOSED]],
  [REOPENED, [FIX_PROPOSED]],
  [UNMATCHED, [FIX_PROPOSED]],
  [FIX_PROPOSED, [REOPENED]],
  [VERIFIED, [REOPENED]],
]);

const AGENT_QUESTION_TRANSITIONS: TransitionTable = new Map<FindingStatus, readonly FindingStatus[]>([
  [OPEN, [ANSWERED]],
  [REOPENED, [ANSWERED]],
  [UNMATCHED, [ANSWERED]],
  [ANSWERED, [REOPENED]],
  [CLOSED, [REOPENED]],
]);

const AGENT_TRANSITIONS = new Map<FindingKind, TransitionTable>([
  [FINDING_KINDS.CONCERN, AGENT_CONCERN_TRANSITIONS],
  [FINDING_KINDS.QUESTION, AGENT_QUESTION_TRANSITIONS],
]);

/**
 * The statuses a coding agent can move a finding to: propose a fix for a concern, answer a question, or
 * reopen what it finds still wrong. Verifying, closing and withdrawing stay with the reviewer.
 */
export function agentFindingStatuses(kind: FindingKind, status: FindingStatus): readonly FindingStatus[] {
  return AGENT_TRANSITIONS.get(kind)?.get(status) ?? [];
}

export function canAgentSetFindingStatus(kind: FindingKind, from: FindingStatus, to: FindingStatus) {
  return agentFindingStatuses(kind, from).includes(to);
}
