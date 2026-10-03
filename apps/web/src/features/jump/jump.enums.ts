import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';

/** What a Jump to result opens, in the order the groups are listed. */
export const jumpGroupsEnumwaii = em(['CARD', 'FILE', 'REVIEW', 'SCREEN']);

export const JUMP_GROUPS = jumpGroupsEnumwaii.enum;
export type JumpGroup = InferEnumwaii<typeof jumpGroupsEnumwaii>;
export const jumpGroupValues = jumpGroupsEnumwaii.values;

export const JUMP_GROUP_LABELS = jumpGroupsEnumwaii.derive(
  [JUMP_GROUPS.CARD, 'Units in this review'],
  [JUMP_GROUPS.FILE, 'Files in this review'],
  [JUMP_GROUPS.REVIEW, 'Reviews'],
  [JUMP_GROUPS.SCREEN, 'Screens'],
);
