import { oc } from '@orpc/contract';
import z from 'zod';

export const hostContract = oc.router({
  pickDirectory: oc
    .route({
      summary: 'Pick a folder',
      description: 'Opens the native folder picker. Resolves with null when the picker is cancelled.',
    })
    .input(z.object({ title: z.string().min(1).max(120) }))
    .output(z.object({ path: z.string().nullable() })),

  openFile: oc
    .route({
      summary: 'Open a text file',
      description:
        'Opens the native file picker limited to the extensions and returns the name and text of the chosen file. Resolves with null when the picker is cancelled.',
    })
    .input(
      z.object({
        title: z.string().min(1).max(120),
        extensions: z
          .array(z.string().regex(/^[a-z0-9]+$/i))
          .min(1)
          .max(10),
      }),
    )
    .output(z.object({ file: z.object({ name: z.string(), content: z.string() }).nullable() })),

  openExternal: oc
    .route({
      summary: 'Open a link outside Chaff',
      description:
        'Opens an https link in the browser or an editor link (vscode, vscode-insiders, cursor) in that editor. Other schemes are rejected.',
    })
    .input(z.object({ url: z.string().min(1).max(4096) }))
    .output(z.object({ isOpened: z.boolean() })),
});
