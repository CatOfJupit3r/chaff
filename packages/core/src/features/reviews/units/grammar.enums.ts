import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

/** Tree-sitter grammars Chaff parses to find the declarations that own changed lines. */
export const grammarsEnumwaii = new Enumwaii('Grammar', [
  'TYPESCRIPT',
  'TSX',
  'JAVASCRIPT',
  'PYTHON',
  'GO',
  'RUST',
  'JAVA',
  'C_SHARP',
  'RUBY',
  'PHP',
  'CPP',
  'BASH',
  'POWERSHELL',
]);

export const GRAMMARS = grammarsEnumwaii.enum;
export type Grammar = InferEnumwaii<typeof grammarsEnumwaii>;

export const GRAMMAR_FILES = grammarsEnumwaii.derive({
  [GRAMMARS.TYPESCRIPT]: 'tree-sitter-typescript.wasm',
  [GRAMMARS.TSX]: 'tree-sitter-tsx.wasm',
  [GRAMMARS.JAVASCRIPT]: 'tree-sitter-javascript.wasm',
  [GRAMMARS.PYTHON]: 'tree-sitter-python.wasm',
  [GRAMMARS.GO]: 'tree-sitter-go.wasm',
  [GRAMMARS.RUST]: 'tree-sitter-rust.wasm',
  [GRAMMARS.JAVA]: 'tree-sitter-java.wasm',
  [GRAMMARS.C_SHARP]: 'tree-sitter-c-sharp.wasm',
  [GRAMMARS.RUBY]: 'tree-sitter-ruby.wasm',
  [GRAMMARS.PHP]: 'tree-sitter-php.wasm',
  [GRAMMARS.CPP]: 'tree-sitter-cpp.wasm',
  [GRAMMARS.BASH]: 'tree-sitter-bash.wasm',
  [GRAMMARS.POWERSHELL]: 'tree-sitter-powershell.wasm',
});
