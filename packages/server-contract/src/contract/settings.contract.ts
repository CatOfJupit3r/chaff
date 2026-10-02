import { oc } from '@orpc/contract';
import z from 'zod';

import { MAX_DIGEST_INSTRUCTIONS_LENGTH } from '@chaff/common/constants/agents.constants';
import { NAVIGATOR_WIDTH } from '@chaff/common/constants/layout.constants';
import { MAX_ONBOARDING_ENTRIES } from '@chaff/common/constants/onboarding.constants';
import {
  accentSchema,
  codeFontSchema,
  codeLineHeightSchema,
  codeSizeSchema,
  densitySchema,
  syntaxThemeSchema,
  themeModeSchema,
} from '@chaff/common/enums/appearance.enums';
import { diffContextSchema, diffLayoutSchema, inlineDiffSchema } from '@chaff/common/enums/diff.enums';
import { digestDiffModeSchema, digestRunnerSchema } from '@chaff/common/enums/digest.enums';
import { editorSchema } from '@chaff/common/enums/editors.enums';
import {
  onboardingHintSchema,
  onboardingItemSchema,
  onboardingStatusSchema,
} from '@chaff/common/enums/onboarding.enums';
import { reviewProgressionSchema } from '@chaff/common/enums/review.enums';
import { shortcutActionSchema } from '@chaff/common/enums/shortcuts.enums';
import { isSafeAgentModel } from '@chaff/common/helpers/agent-model.helper';

/** The getting-started checklist: whether it is open, the items the user has done, and the screen hints already shown. */
export const onboardingSchema = z.object({
  status: onboardingStatusSchema,
  completedItems: z.array(onboardingItemSchema).max(MAX_ONBOARDING_ENTRIES),
  shownHints: z.array(onboardingHintSchema).max(MAX_ONBOARDING_ENTRIES),
});

/** A lower-cased `KeyboardEvent.key`: one printable character other than a space or a capital letter. */
export const shortcutKeySchema = z.string().regex(/^[!-@[-~]$/);

/** Keys the user picked for actions; the others keep their default. */
export const shortcutBindingsSchema = z.array(z.object({ action: shortcutActionSchema, key: shortcutKeySchema }));

/** For each runner set by the user: a command name looked up on PATH, or the full path of the executable. */
export const agentCommandsSchema = z.array(
  z.object({ runner: digestRunnerSchema, command: z.string().trim().min(1).max(1024) }),
);

/** A model id handed to a coding agent, or empty for the agent's own default. */
export const agentModelSchema = z
  .string()
  .trim()
  .refine((model) => model === '' || isSafeAgentModel(model), {
    message: 'Use one model id with no spaces that does not start with a dash',
  });

/** For each runner set by the user: the model its digests use unless one is picked when starting. */
export const agentModelsSchema = z.array(
  z.object({ runner: digestRunnerSchema, model: agentModelSchema.pipe(z.string().min(1)) }),
);

/** Extra instructions from the reviewer, added to the digest prompt. */
export const digestInstructionsSchema = z.string().trim().max(MAX_DIGEST_INSTRUCTIONS_LENGTH);

export const settingsSchema = z.object({
  /** Editor that file and line links open in. */
  editor: editorSchema,
  theme: themeModeSchema,
  accent: accentSchema,
  codeSize: codeSizeSchema,
  codeFont: codeFontSchema,
  codeLineHeight: codeLineHeightSchema,
  /** Spacing of the whole interface. */
  density: densitySchema,
  /** Syntax colors in light mode. */
  syntaxLight: syntaxThemeSchema,
  /** Syntax colors in dark mode. */
  syntaxDark: syntaxThemeSchema,
  /** Layout the Full diff opens in. */
  diffLayout: diffLayoutSchema,
  /** Unchanged lines shown around each change. */
  diffContext: diffContextSchema,
  /** Changes that only add or remove whitespace are left out of diffs. */
  isWhitespaceIgnored: z.boolean(),
  /** How changes inside a changed line are marked. */
  inlineDiff: inlineDiffSchema,
  /** Width of the Full diff's file list, in pixels. */
  navigatorWidth: z.number().int().min(NAVIGATOR_WIDTH.min).max(NAVIGATOR_WIDTH.max),
  /** The Focus context panel opens with every review. */
  isContextPanelPinned: z.boolean(),
  /** Progression Focus starts in. */
  defaultProgression: reviewProgressionSchema,
  /** Coding agent that writes digests. */
  digestRunner: digestRunnerSchema,
  /** Where to find each coding agent when it is not the usual command on PATH. */
  agentCommands: agentCommandsSchema,
  /** Model each coding agent writes digests with when the user set one. */
  agentModels: agentModelsSchema,
  /** Extra instructions every digest starts with; they can be changed when starting one. */
  digestInstructions: digestInstructionsSchema,
  /** Whether digests carry the diff in the prompt or have the agent read it from files; Auto decides by its size. */
  digestDiffMode: digestDiffModeSchema,
  shortcuts: shortcutBindingsSchema,
  onboarding: onboardingSchema,
});

export const settingsContract = oc.router({
  get: oc
    .route({
      summary: 'Read app settings',
      description:
        'Returns the editor that file links open in, the appearance preferences, the coding agents and the keyboard map.',
    })
    .output(settingsSchema),

  update: oc
    .route({
      summary: 'Change app settings',
      description:
        'Updates the given preferences and returns the full settings. A theme change also restyles the window. Agent commands, agent models and shortcuts replace the stored maps whole; two actions on one screen cannot share a key.',
    })
    .input(settingsSchema.omit({ onboarding: true }).partial())
    .output(settingsSchema),

  updateOnboarding: oc
    .route({
      summary: 'Save onboarding progress',
      description:
        'Stores the checklist on this computer: its status, the items done and the screen hints already shown. Repeated entries are kept once. Completed and skipped guides stay closed.',
    })
    .input(onboardingSchema)
    .output(onboardingSchema),

  replayOnboarding: oc
    .route({
      summary: 'Replay onboarding guide',
      description: 'Opens the checklist again with no items done and no hints shown, preserving app preferences.',
    })
    .output(onboardingSchema),
});
