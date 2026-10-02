import { oc } from '@orpc/contract';
import z from 'zod';

import {
  diagramKindSchema,
  digestRunnerSchema,
  digestStatusSchema,
  intentSourceSchema,
  testTierSchema,
} from '@chaff/common/enums/digest.enums';

import { agentModelSchema, digestInstructionsSchema } from './settings.contract';

const idSchema = z.string().min(1).max(64);

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

export const digestSchema = z.object({
  id: z.string(),
  snapshotId: z.string(),
  runner: digestRunnerSchema,
  /** The model the agent was asked to use; absent when it used its own default. */
  model: z.string().optional(),
  status: digestStatusSchema,
  progress: z.string().optional(),
  error: z.string().optional(),
  content: digestContentSchema.optional(),
  /** While running, with an agent that streams its answer. */
  preview: digestPreviewSchema.optional(),
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
        'Starts the chosen coding agent in a read-only checkout of the snapshot. It runs in the background; poll `get` for progress. Model and instructions default to the ones in Settings; an empty model leaves the choice to the agent.',
    })
    .input(
      z.object({
        snapshotId: idSchema,
        runner: digestRunnerSchema,
        model: agentModelSchema.optional(),
        /** Added to the prompt after the answer's format, which they cannot change. */
        instructions: digestInstructionsSchema.optional(),
      }),
    )
    .output(digestSchema),

  cancel: oc
    .route({ summary: 'Stop a digest', description: 'Stops a running digest and discards what it wrote.' })
    .input(z.object({ digestId: idSchema }))
    .output(digestSchema),

  runners: oc
    .route({
      summary: 'List coding agents',
      description: 'Reports which of Claude Code and Codex can be started on this computer.',
    })
    .output(z.array(digestRunnerStatusSchema)),
});
