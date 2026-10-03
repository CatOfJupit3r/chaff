import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import 'reflect-metadata';
import { afterAll, describe, expect, it } from 'vitest';

import { FILE_KINDS, FILE_STATUSES, SYMBOL_KINDS, UNIT_CHANGES, UNIT_KINDS } from '@chaff/common/enums/review.enums';
import type { FileKind, FileStatus } from '@chaff/common/enums/review.enums';

import type { iCoreOptions } from '@~/core.types';
import { LoggerFactory } from '@~/features/logger/logger.factory';
import { DIFF_LINE_TYPES } from '@~/features/reviews/diff/diff.enums';
import { parsePatch } from '@~/features/reviews/diff/patch.utils';
import { grammarForPath } from '@~/features/reviews/units/grammar.utils';
import { TreeSitterService } from '@~/features/reviews/units/tree-sitter.service';
import { buildFileUnits } from '@~/features/reviews/units/unit-builder.utils';
import type { iBuiltUnit } from '@~/features/reviews/units/unit-builder.utils';

const treeSitter = new TreeSitterService({} as iCoreOptions, new LoggerFactory());
const scratch = mkdtempSync(path.join(tmpdir(), 'chaff-units-'));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

interface iBuildOptions {
  status?: FileStatus;
  kind?: FileKind;
}

/** Diffs two versions of a file with git and splits the result into units. */
async function build(filePath: string, oldSource: string, newSource: string, options: iBuildOptions = {}) {
  const oldFile = path.join(scratch, 'old');
  const newFile = path.join(scratch, 'new');
  writeFileSync(oldFile, oldSource);
  writeFileSync(newFile, newSource);
  let patch = '';
  try {
    execFileSync('git', ['diff', '--no-index', '--no-color', '-U3', oldFile, newFile], { encoding: 'utf8' });
  } catch (error) {
    patch = (error as { stdout: string }).stdout;
  }

  const { lines, isBinary } = parsePatch(patch);
  const grammar = grammarForPath(filePath);
  const status = options.status ?? FILE_STATUSES.MODIFIED;
  const [oldDeclarations, newDeclarations] = await Promise.all([
    grammar && status !== FILE_STATUSES.ADDED ? treeSitter.extractDeclarations(grammar, oldSource) : [],
    grammar && status !== FILE_STATUSES.DELETED ? treeSitter.extractDeclarations(grammar, newSource) : [],
  ]);
  const units = buildFileUnits({
    path: filePath,
    oldPath: filePath,
    status,
    kind: options.kind ?? FILE_KINDS.SOURCE,
    isBinary,
    lines,
    oldDeclarations,
    newDeclarations,
  });
  return { units, lines };
}

/** Every changed line is counted in exactly one region of exactly one unit. */
function expectEveryChangeCovered(units: iBuiltUnit[], lines: ReturnType<typeof parsePatch>['lines']) {
  const regions = units.flatMap((unit) => unit.regions);
  expect(units.every((unit) => unit.regions.length > 0)).toBe(true);
  expect(regions.reduce((sum, region) => sum + region.additions, 0)).toBe(
    lines.filter((line) => line.type === DIFF_LINE_TYPES.ADDED).length,
  );
  expect(regions.reduce((sum, region) => sum + region.deletions, 0)).toBe(
    lines.filter((line) => line.type === DIFF_LINE_TYPES.DELETED).length,
  );
}

function summarize(units: iBuiltUnit[]) {
  return units.map((unit) => ({ kind: unit.kind, title: unit.title, change: unit.change }));
}

const SCHEDULER = `import { delay } from './delay';

export class Scheduler {
  private attempts = 0;

  next(attempt: number): number {
    return attempt * 2;
  }

  reset() {
    this.attempts = 0;
  }
}
`;

describe('buildFileUnits', () => {
  it('gives a changed method its own unit and new imports their own section', async () => {
    const changed = SCHEDULER.replace(
      "import { delay } from './delay';",
      "import { delay } from './delay';\nimport { jitter } from './jitter';",
    ).replace('return attempt * 2;', 'const base = attempt * 2;\n    return base + jitter();');

    const { units, lines } = await build('src/scheduler.ts', SCHEDULER, changed);

    expect(summarize(units)).toEqual([
      { kind: UNIT_KINDS.SECTION, title: 'Imports', change: UNIT_CHANGES.ADDED },
      { kind: UNIT_KINDS.FUNCTION, title: 'Scheduler.next', change: UNIT_CHANGES.MODIFIED },
    ]);
    expect(units[1]).toMatchObject({ symbolKind: SYMBOL_KINDS.METHOD, newStartLine: 7, newEndLine: 10 });
    expectEveryChangeCovered(units, lines);
  });

  it('treats a renamed function as one removed and one added unit, each with its own region', async () => {
    const before = 'export function total(items: number[]) {\n  return items.length;\n}\n';
    const after = 'export function count(items: number[]) {\n  return items.length;\n}\n';

    const { units, lines } = await build('src/count.ts', before, after);

    expect(summarize(units)).toEqual([
      { kind: UNIT_KINDS.FUNCTION, title: 'total', change: UNIT_CHANGES.REMOVED },
      { kind: UNIT_KINDS.FUNCTION, title: 'count', change: UNIT_CHANGES.ADDED },
    ]);
    expect(units.map((unit) => unit.isExported)).toEqual([true, true]);
    expect(units.flatMap((unit) => unit.regions).map((region) => region.deletions + region.additions)).toEqual([1, 1]);
    expectEveryChangeCovered(units, lines);
  });

  it('gives an added arrow function a unit that starts at its export keyword', async () => {
    const before = 'export const one = 1;\n';
    const after =
      'export const one = 1;\n\nexport const param = (input: { param: string }) => {\n  return input.param;\n};\n';

    const { units, lines } = await build('src/param.ts', before, after);

    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({
      kind: UNIT_KINDS.FUNCTION,
      title: 'param',
      change: UNIT_CHANGES.ADDED,
      symbolKind: SYMBOL_KINDS.FUNCTION,
      newStartLine: 3,
      newEndLine: 5,
    });
    expectEveryChangeCovered(units, lines);
  });

  it('names a stray change inside a large class after the class', async () => {
    const methods = Array.from({ length: 30 }, (_, index) => `  m${index}() {\n    return ${index};\n  }`).join('\n');
    const before = `export class Big {\n  private size = 1;\n${methods}\n}\n`;
    const after = before.replace('private size = 1;', 'private size = 2;');

    const { units } = await build('src/big.ts', before, after);

    expect(summarize(units)).toEqual([
      { kind: UNIT_KINDS.SECTION, title: 'Big: private size = 2;', change: UNIT_CHANGES.MODIFIED },
    ]);
  });

  it('makes test blocks units in test files', async () => {
    const before = "describe('parser', () => {\n  it('reads', () => {\n    expect(1).toBe(1);\n  });\n});\n";
    const after = before.replace('toBe(1)', 'toBe(2)');

    const { units } = await build('src/parser.test.ts', before, after, { kind: FILE_KINDS.TEST });

    expect(units.map((unit) => [unit.title, unit.symbolKind])).toEqual([
      ['describe(parser).it(reads)', SYMBOL_KINDS.TEST],
    ]);
  });

  it('finds methods in Python, Go, Rust and Java', async () => {
    const python = await build(
      'app/jobs.py',
      'class Job:\n    def run(self):\n        return 1\n',
      'class Job:\n    def run(self):\n        return 2\n',
    );
    const go = await build(
      'server.go',
      'package main\n\nfunc (s *Server) Start() error {\n\treturn nil\n}\n',
      'package main\n\nfunc (s *Server) Start() error {\n\treturn errStart\n}\n',
    );
    const rust = await build(
      'src/point.rs',
      'impl Point {\n    pub fn new(x: i32) -> Self {\n        Point { x }\n    }\n}\n',
      'impl Point {\n    pub fn new(x: i32) -> Self {\n        Point { x: x + 1 }\n    }\n}\n',
    );
    const java = await build(
      'src/Foo.java',
      'public class Foo {\n  public int bar() {\n    return 1;\n  }\n}\n',
      'public class Foo {\n  public int bar() {\n    return 2;\n  }\n}\n',
    );

    expect([python, go, rust, java].map(({ units }) => units.map((unit) => unit.title))).toEqual([
      ['Job.run'],
      ['Server.Start'],
      ['Point.new'],
      ['Foo.bar'],
    ]);
    expect(go.units[0]?.isExported).toBe(true);
  });

  it('keeps a deleted file as one section', async () => {
    const { units, lines } = await build('src/old.ts', SCHEDULER, '', { status: FILE_STATUSES.DELETED });

    expect(summarize(units)).toEqual([
      { kind: UNIT_KINDS.SECTION, title: 'File deleted', change: UNIT_CHANGES.REMOVED },
    ]);
    expect(units[0]?.regions).toHaveLength(1);
    expectEveryChangeCovered(units, lines);
  });

  it('keeps a generated file as one section with a file-level region', async () => {
    const { units } = await build('pnpm-lock.yaml', 'a: 1\n', 'a: 2\nb: 3\n', { kind: FILE_KINDS.GENERATED });

    expect(summarize(units)).toEqual([
      { kind: UNIT_KINDS.SECTION, title: 'Generated file', change: UNIT_CHANGES.MODIFIED },
    ]);
    expect(units[0]?.regions).toEqual([expect.objectContaining({ isFileLevel: true, additions: 2, deletions: 1 })]);
  });

  it('gives a small config change one section with a region per changed run', async () => {
    const before = Array.from({ length: 20 }, (_, index) => `key${index}: ${index}`).join('\n');
    const after = before.replace('key1: 1', 'key1: 100').replace('key15: 15', 'key15: 150');

    const { units } = await build('config.yaml', `${before}\n`, `${after}\n`, { kind: FILE_KINDS.CONFIG });

    expect(summarize(units)).toEqual([
      { kind: UNIT_KINDS.SECTION, title: 'Configuration', change: UNIT_CHANGES.MODIFIED },
    ]);
    expect(units[0]?.regions.map((region) => region.oldStartLine)).toEqual([2, 16]);
  });
});
