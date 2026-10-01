import { oc } from '@orpc/contract';
import z from 'zod';

import { accentSchema, codeSizeSchema, themeModeSchema } from '@chaff/common/enums/appearance.enums';
import { editorSchema } from '@chaff/common/enums/editors.enums';

export const settingsSchema = z.object({
  /** Editor that file and line links open in. */
  editor: editorSchema,
  theme: themeModeSchema,
  accent: accentSchema,
  codeSize: codeSizeSchema,
});

export const settingsContract = oc.router({
  get: oc
    .route({
      summary: 'Read app settings',
      description: 'Returns the editor that file links open in and the appearance preferences.',
    })
    .output(settingsSchema),

  update: oc
    .route({
      summary: 'Change app settings',
      description:
        'Updates the given preferences and returns the full settings. A theme change also restyles the window.',
    })
    .input(settingsSchema.partial())
    .output(settingsSchema),
});
