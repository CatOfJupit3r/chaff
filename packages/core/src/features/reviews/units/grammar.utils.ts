import path from 'node:path';

import { GRAMMARS } from './grammar.enums';
import type { Grammar } from './grammar.enums';

const GRAMMARS_BY_EXTENSION: Record<string, Grammar> = {
  '.ts': GRAMMARS.TYPESCRIPT,
  '.mts': GRAMMARS.TYPESCRIPT,
  '.cts': GRAMMARS.TYPESCRIPT,
  '.tsx': GRAMMARS.TSX,
  '.js': GRAMMARS.JAVASCRIPT,
  '.mjs': GRAMMARS.JAVASCRIPT,
  '.cjs': GRAMMARS.JAVASCRIPT,
  '.jsx': GRAMMARS.JAVASCRIPT,
  '.py': GRAMMARS.PYTHON,
  '.pyi': GRAMMARS.PYTHON,
  '.go': GRAMMARS.GO,
  '.rs': GRAMMARS.RUST,
  '.java': GRAMMARS.JAVA,
  '.cs': GRAMMARS.C_SHARP,
  '.rb': GRAMMARS.RUBY,
  '.php': GRAMMARS.PHP,
  '.c': GRAMMARS.CPP,
  '.h': GRAMMARS.CPP,
  '.cc': GRAMMARS.CPP,
  '.cpp': GRAMMARS.CPP,
  '.cxx': GRAMMARS.CPP,
  '.hh': GRAMMARS.CPP,
  '.hpp': GRAMMARS.CPP,
  '.sh': GRAMMARS.BASH,
  '.bash': GRAMMARS.BASH,
  '.ps1': GRAMMARS.POWERSHELL,
  '.psm1': GRAMMARS.POWERSHELL,
  '.kt': GRAMMARS.KOTLIN,
  '.kts': GRAMMARS.KOTLIN,
};

/** The grammar for a file path, or undefined when Chaff cannot parse that language. */
export function grammarForPath(filePath: string): Grammar | undefined {
  return GRAMMARS_BY_EXTENSION[path.posix.extname(filePath).toLowerCase()];
}
