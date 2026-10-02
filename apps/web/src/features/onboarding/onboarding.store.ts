import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

import type { OnboardingItem } from '@chaff/common/enums/onboarding.enums';

/** Whether the checklist is expanded or folded to its progress pill on this device. */
export const isGuideExpandedAtom = atomWithStorage('chaff.guideExpanded', true, undefined, { getOnInit: true });

/** The checklist row opened to show its tip and Show me. */
export const openGuideItemAtom = atom<OnboardingItem | undefined>(undefined);

/** The item whose control Show me is pointing at. */
export const guideTipItemAtom = atom<OnboardingItem | undefined>(undefined);

/** Set when the last item was done in this session, so the panel can say so before it closes. */
export const isGuideFinishShownAtom = atom(false);
