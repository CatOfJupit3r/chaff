import { oc } from '@orpc/contract';
import z from 'zod';

import { NAVIGATOR_WIDTH } from '@chaff/common/constants/layout.constants';
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
import { digestRunnerSchema } from '@chaff/common/enums/digest.enums';
import { editorSchema } from '@chaff/common/enums/editors.enums';
import { reviewProgressionSchema } from '@chaff/common/enums/review.enums';
import { shortcutActionSchema } from '@chaff/common/enums/shortcuts.enums';

/** A lower-cased `KeyboardEvent.key`: one printable character other than a space or a capital letter. */
export const shortcutKeySchema = z.string().regex(/^[!-@[-~]$/);

/** Keys the user picked for actions; the others keep their default. */
export const shortcutBindingsSchema = z.array(z.object({ action: shortcutActionSchema, key: shortcutKeySchema }));

/** For each runner set by the user: a command name looked up on PATH, or the full path of the executable. */
export const agentCommandsSchema = z.array(
  z.object({ runner: digestRunnerSchema, command: z.string().trim().min(1).max(1024) }),
);

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
  shortcuts: shortcutBindingsSchema,
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
        'Updates the given preferences and returns the full settings. A theme change also restyles the window. Agent commands and shortcuts replace the stored maps whole; two actions on one screen cannot share a key.',
    })
    .input(settingsSchema.partial())
    .output(settingsSchema),
});
