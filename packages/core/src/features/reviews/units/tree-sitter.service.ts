import type { Language, Parser } from '@vscode/tree-sitter-wasm';
import { createRequire } from 'node:module';
import path from 'node:path';
import { inject, singleton } from 'tsyringe';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN } from '@~/di/tokens';
import { LoggerFactory } from '@~/features/logger/logger.factory';

import { extractDeclarations } from './declarations.utils';
import type { iDeclaration } from './declarations.utils';
import { GRAMMAR_FILES, SEPARATE_GRAMMAR_PACKAGES } from './grammar.enums';
import type { Grammar } from './grammar.enums';

const require = createRequire(import.meta.url);

interface iTreeSitterModule {
  Parser: typeof Parser;
  Language: typeof Language;
}

/** Files larger than this are left as sections; they are rarely hand-written. */
const MAX_PARSE_CHARACTERS = 1_000_000;
const PARSE_BUDGET_MS = 1000;

/** Folder of the tree-sitter runtime and grammars when the app does not pass one. */
function packagedGrammarsDirectory() {
  return path.dirname(require.resolve('@vscode/tree-sitter-wasm'));
}

/**
 * Parses source files with the WASM build of tree-sitter. The runtime is loaded from disk with
 * `require` rather than bundled, because it locates its own `.wasm` files relative to itself.
 */
@singleton()
export class TreeSitterService {
  private readonly logger;

  private runtime: Promise<{ module: iTreeSitterModule; parser: Parser }> | undefined;

  private readonly languages = new Map<Grammar, Promise<Language | undefined>>();

  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('tree-sitter');
  }

  /** Declarations in `source`, or an empty list when it cannot be parsed in time. */
  public async extractDeclarations(grammar: Grammar, source: string): Promise<iDeclaration[]> {
    if (source.length > MAX_PARSE_CHARACTERS) return [];
    const language = await this.loadLanguage(grammar);
    if (!language) return [];

    const { parser } = await this.loadRuntime();
    parser.setLanguage(language);
    const deadline = performance.now() + PARSE_BUDGET_MS;
    const tree = parser.parse(source, null, { progressCallback: () => performance.now() > deadline });
    if (!tree) return [];
    try {
      return extractDeclarations(tree.rootNode, grammar);
    } finally {
      tree.delete();
    }
  }

  private get directory() {
    return this.options.treeSitterDir ?? packagedGrammarsDirectory();
  }

  private grammarPath(grammar: Grammar) {
    const separatePackage = SEPARATE_GRAMMAR_PACKAGES.get(grammar);
    const directory =
      this.options.treeSitterDir ??
      (separatePackage ? path.dirname(require.resolve(`${separatePackage}/package.json`)) : this.directory);
    return path.join(directory, GRAMMAR_FILES(grammar));
  }

  private async loadRuntime() {
    this.runtime ??= (async () => {
      const { directory } = this;
      // The runtime path is only known at run time (installed package or the app's resources folder).
      // eslint-disable-next-line import-x/no-dynamic-require
      const module = require(path.join(directory, 'tree-sitter.js')) as iTreeSitterModule;
      await module.Parser.init({ locateFile: (file: string) => path.join(directory, file) });
      return { module, parser: new module.Parser() };
    })();
    return this.runtime;
  }

  private async loadLanguage(grammar: Grammar) {
    let language = this.languages.get(grammar);
    if (!language) {
      language = this.loadRuntime()
        .then(async ({ module }) => module.Language.load(this.grammarPath(grammar)))
        .catch((error: unknown) => {
          this.logger.warn('Could not load a tree-sitter grammar', { grammar, error: String(error) });
          return undefined;
        });
      this.languages.set(grammar, language);
    }
    return language;
  }
}
