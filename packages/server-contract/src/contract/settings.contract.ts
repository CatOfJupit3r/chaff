import { oc } from '@orpc/contract';
import z from 'zod';

import { accentSchema, codeSizeSchema, themeModeSchema } from '@chaff/common/enums/appearance.enums';
import { digestRunnerSchema } from '@chaff/common/enums/digest.enums';
import { editorSchema } from '@chaff/common/enums/editors.enums';
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
