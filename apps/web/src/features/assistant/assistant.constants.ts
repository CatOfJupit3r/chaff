/** How often a thread is asked for the answer being written. */
export const WRITING_POLL_MS = 700;

/** Questions offered with one click, for the explanations reviewers ask for most. */
export const QUICK_QUESTIONS = [
  'Explain this change in more detail.',
  'Why was it done this way?',
  'What could this break?',
  'How is this tested?',
] as const;
