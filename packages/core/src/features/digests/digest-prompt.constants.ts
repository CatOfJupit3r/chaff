/** What the overview says; shared by the digest and a rewrite of its overview. */
export const OVERVIEW_RULES = 'two to four plain sentences on what the branch does.';

/** What a unit's note holds; shared by the digest and a rewrite of one note. */
export const UNIT_NOTE_RULES =
  'a summary of what changed and what it affects in one to three sentences, worthChecking with zero to three specific things to inspect (phrased as things to check, never as verdicts), and the tests relevant to it. Use tier EXISTS when a relevant test exists and INSPECTED when you read it and it exercises this unit. Never claim PASSED: nothing was run.';

/** How a diagram is drawn; shared by the digest and a rewrite of one diagram. */
export const DIAGRAM_RULES =
  'Write Mermaid (flowchart, stateDiagram-v2 or sequenceDiagram), keep it under 15 nodes, name a node that stands for one unit by that unit\'s id (`u3["Scheduler.next"]`) so the reviewer can open it from the drawing, label edges you inferred rather than read with "inferred", and set isSuggestion only for an alternative design rather than the code as written.';

export const STYLE_RULES =
  'Style: plain and concrete. Name identifiers in backticks. No promotional words such as robust, seamless, scalable, elegant or powerful.';
