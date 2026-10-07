import { oc } from '@orpc/contract';
import z from 'zod';

import {
  diagramKindSchema,
  digestPartSchema,
  digestRunnerSchema,
  digestStatusSchema,
  intentSourceSchema,
  testTierSchema,
} from '@chaff/common/enums/digest.enums';

const idSchema = z.string().min(1).max(64);

/** A model id or alias the agent CLI accepts, such as `opus` or `gpt-6-astra`; never starts like a flag. */
export const digestModelSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[\w.][\w.:/@[\]+ -]*$/);

/** Extra instructions the reviewer gives the agent for one digest. */
export const digestInstructionsSchema = z.string().trim().min(1).max(4000);

export const digestStartOptionsSchema = z.object({
  /** Leave out for the agent's own default model. */
  model: digestModelSchema.optional(),
  instructions: digestInstructionsSchema.optional(),
});

export const digestTestSchema = z.object({
  path: z.string(),
  /** 1-based line of the test, when the agent named one. */
  line: z.number().int().positive().optional(),
  tier: testTierSchema,
  note: z.string(),
});

/** What the agent wrote about one unit. */
export const digestUnitNoteSchema = z.object({
  unitId: z.string(),
  summary: z.string(),
  /** Things to inspect, phrased as questions or checks rather than verdicts. */
  worthChecking: z.array(z.string()),
  tests: z.array(digestTestSchema),
});

/** A behavior or design change made of several units. */
export const digestGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  before: z.string(),
  after: z.string(),
  intent: z.string(),
  intentSource: intentSourceSchema,
  unitIds: z.array(z.string()),
  /** Holds the units no group explained, so every change stays reachable. */
  isUnexplained: z.boolean(),
});

export const digestDiagramSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: diagramKindSchema,
  /** Mermaid source. */
  mermaid: z.string(),
  unitIds: z.array(z.string()),
  /** Nodes of the drawing that stand for a unit, by the id the node has in the Mermaid source. */
  nodeUnits: z.array(z.object({ node: z.string(), unitId: z.string() })).default([]),
  /** A proposed alternative rather than the code as it is. */
  isSuggestion: z.boolean(),
});

export const digestContentSchema = z.object({
  overview: z.string(),
  groups: z.array(digestGroupSchema),
  /** Every unit of the snapshot, in the order the agent suggests reading them. */
  readingOrder: z.array(z.string()),
  units: z.array(digestUnitNoteSchema),
  diagrams: z.array(digestDiagramSchema),
  /** Files too large to fit in the prompt; the agent was given where they changed and read them itself. */
  outlinedPaths: z.array(z.string()).default([]),
});

/** What has arrived of a digest that is still being written. */
export const digestPreviewSchema = z.object({
  overview: z.string(),
  groupTitles: z.array(z.string()),
  /** Units the agent has written about so far, out of `unitCount`. */
  noteCount: z.number().int(),
  unitCount: z.number().int(),
  diagramCount: z.number().int(),
});

/** Which part of a digest: the overview, one unit's note by unit id, or one diagram by its id. */
export const digestPartRefSchema = z.object({
  part: digestPartSchema,
  /** The unit id for a unit note, the diagram id for a diagram; left out for the overview. */
  partId: idSchema.optional(),
});

/** A version of one part written on the reviewer's instructions; the digest's own version is the first. */
export const digestRevisionSchema = digestPartRefSchema.extend({
  id: z.string(),
  instructions: z.string(),
  runner: digestRunnerSchema,
  model: z.string().optional(),
  status: digestStatusSchema,
  progress: z.string().optional(),
  error: z.string().optional(),
  /** The version shown, and used everywhere the digest is read; when none of a part's is, the digest's own is. */
  isSelected: z.boolean(),
  startedAt: z.date(),
  finishedAt: z.date().optional(),
});

export const digestSchema = z.object({
  id: z.string(),
  snapshotId: z.string(),
  runner: digestRunnerSchema,
  /** The model asked for; absent when the agent used its default. */
  model: z.string().optional(),
  instructions: z.string().optional(),
  status: digestStatusSchema,
  progress: z.string().optional(),
  error: z.string().optional(),
  /** With the selected version of every part that has been rewritten. */
  content: digestContentSchema.optional(),
  /** While running, with an agent that streams its answer. */
  preview: digestPreviewSchema.optional(),
  /** Every rewritten version of the digest's parts, oldest first. */
  revisions: z.array(digestRevisionSchema),
  startedAt: z.date(),
  finishedAt: z.date().optional(),
});

export const digestRunnerStatusSchema = z.object({
  runner: digestRunnerSchema,
  isAvailable: z.boolean(),
  /** What was looked up: the command or path from Settings, else the usual command name. */
  command: z.string(),
  /** Where the agent was found. */
  path: z.string().optional(),
});

/** A model the agent can be started with. */
export const agentModelSchema = z.object({
  /** What is passed as `--model`. */
  id: digestModelSchema,
  label: z.string(),
  description: z.string().optional(),
});

export const digestsContract = oc.router({
  get: oc
    .route({
      summary: "Get a snapshot's digest",
      description: 'Returns the newest digest of the snapshot, running or finished, or null when none was asked for.',
    })
    .input(z.object({ snapshotId: idSchema }))
    .output(digestSchema.nullable()),

  start: oc
    .route({
      summary: 'Write a digest',
      description:
        'Starts the chosen coding agent in a read-only checkout of the snapshot, with the model and extra instructions when given. It runs in the background; poll `get` for progress.',
    })
    .input(digestStartOptionsSchema.extend({ snapshotId: idSchema, runner: digestRunnerSchema }))
    .output(digestSchema),

  cancel: oc
    .route({ summary: 'Stop a digest', description: 'Stops a running digest and discards what it wrote.' })
    .input(z.object({ digestId: idSchema }))
    .output(digestSchema),

  revise: oc
    .route({
      summary: 'Rewrite part of a digest',
      description:
        "Has the coding agent picked in Settings rewrite the overview, one unit's note or one diagram as the reviewer instructs, starting from the version shown, in a read-only checkout of the snapshot. Earlier versions are kept; the new one is selected once it is ready. Fails with DIGEST_REVISION_RUNNING while that part is already being rewritten.",
    })
    .input(digestPartRefSchema.extend({ digestId: idSchema, instructions: digestInstructionsSchema }))
    .output(digestSchema),

  cancelRevision: oc
    .route({ summary: 'Stop rewriting a part', description: 'Stops a running rewrite and keeps the version shown.' })
    .input(z.object({ revisionId: idSchema }))
    .output(digestSchema),

  selectVersion: oc
    .route({
      summary: "Pick a part's version",
      description:
        "Shows one ready version of a part everywhere the digest is read; without revisionId, the digest's own version.",
    })
    .input(digestPartRefSchema.extend({ digestId: idSchema, revisionId: idSchema.optional() }))
    .output(digestSchema),

  runners: oc
    .route({
      summary: 'List coding agents',
      description: 'Reports which of Claude Code and Codex can be started on this computer.',
    })
    .output(z.array(digestRunnerStatusSchema)),

  models: oc
    .route({
      summary: "List an agent's models",
      description:
        "The models the agent can run a digest with: Codex's own model list, or Claude Code's model aliases. Empty when the agent isn't installed or can't list them.",
    })
    .input(z.object({ runner: digestRunnerSchema }))
    .output(z.array(agentModelSchema)),
});
