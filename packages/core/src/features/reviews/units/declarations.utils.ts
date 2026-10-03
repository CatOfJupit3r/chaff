import type { Node } from '@vscode/tree-sitter-wasm';

import { SYMBOL_KINDS } from '@chaff/common/enums/review.enums';
import type { SymbolKind } from '@chaff/common/enums/review.enums';

import { GRAMMARS } from './grammar.enums';
import type { Grammar } from './grammar.enums';

export interface iDeclaration {
  name: string;
  /** Dotted path through the enclosing declarations, such as `Scheduler.next`. */
  path: string;
  symbolKind: SymbolKind;
  /** Functions, methods and test blocks; classes, types and constants are not function-like. */
  isFunctionLike: boolean;
  /** 1-based, inclusive; includes decorators and `export` keywords in front of the declaration. */
  startLine: number;
  endLine: number;
  isExported: boolean;
}

const FUNCTION_NODE_TYPES = new Set([
  'function_declaration',
  'generator_function_declaration',
  'function_definition',
  'method_definition',
  'method_declaration',
  'constructor_declaration',
  'function_item',
  'function_signature_item',
  'method',
  'singleton_method',
  'function_signature',
  'abstract_method_signature',
  'local_function_statement',
  'operator_declaration',
  'function_statement',
  'class_method_definition',
]);

const CONTAINER_SYMBOL_KINDS: Record<string, SymbolKind> = {
  class_declaration: SYMBOL_KINDS.CLASS,
  abstract_class_declaration: SYMBOL_KINDS.CLASS,
  class_definition: SYMBOL_KINDS.CLASS,
  class: SYMBOL_KINDS.CLASS,
  class_specifier: SYMBOL_KINDS.CLASS,
  class_statement: SYMBOL_KINDS.CLASS,
  record_declaration: SYMBOL_KINDS.CLASS,
  struct_declaration: SYMBOL_KINDS.STRUCT,
  struct_item: SYMBOL_KINDS.STRUCT,
  struct_specifier: SYMBOL_KINDS.STRUCT,
  interface_declaration: SYMBOL_KINDS.INTERFACE,
  trait_item: SYMBOL_KINDS.TRAIT,
  trait_declaration: SYMBOL_KINDS.TRAIT,
  impl_item: SYMBOL_KINDS.IMPL,
  enum_declaration: SYMBOL_KINDS.ENUM,
  enum_item: SYMBOL_KINDS.ENUM,
  enum_specifier: SYMBOL_KINDS.ENUM,
  type_alias_declaration: SYMBOL_KINDS.TYPE,
  type_item: SYMBOL_KINDS.TYPE,
  module: SYMBOL_KINDS.MODULE,
  internal_module: SYMBOL_KINDS.MODULE,
  namespace_declaration: SYMBOL_KINDS.MODULE,
  namespace_definition: SYMBOL_KINDS.MODULE,
  mod_item: SYMBOL_KINDS.MODULE,
};

/** Containers that are usually too large to review as one unit. */
const BROAD_SYMBOL_KINDS = new Set<SymbolKind>([SYMBOL_KINDS.CLASS, SYMBOL_KINDS.IMPL, SYMBOL_KINDS.MODULE]);
/** A broad container still owns stray changed lines when it is at most this many lines long. */
const SMALL_CONTAINER_LINES = 60;

const ASSIGNMENT_NODE_TYPES = new Set([
  'variable_declarator',
  'public_field_definition',
  'field_definition',
  'pair',
  'assignment',
]);
const FUNCTION_VALUE_TYPES = new Set([
  'arrow_function',
  'function_expression',
  'function',
  'generator_function',
  'lambda',
]);
const TEST_CALLEES = new Set([
  'test',
  'it',
  'describe',
  'test.each',
  'it.each',
  'describe.each',
  'test.only',
  'it.only',
  'describe.only',
  'beforeEach',
  'afterEach',
  'beforeAll',
  'afterAll',
]);
const NAME_LIKE_NODE_TYPE = /identifier|name|constant/;
const VISIBILITY_NODE_TYPE = /visibility_modifier|^modifiers?$/;
const PUBLIC_KEYWORD = /\b(pub|public|export)\b/;

function namedChildren(node: Node) {
  return node.namedChildren.filter((child): child is Node => child !== null);
}

function nameOf(node: Node): string | undefined {
  const named = node.childForFieldName('name');
  if (named) return named.text;

  if (node.type === 'impl_item') {
    const type = node.childForFieldName('type')?.text;
    const trait = node.childForFieldName('trait')?.text;
    if (type) return trait ? `${trait} for ${type}` : type;
  }

  // C and C++ nest the name in declarators: function_definition > function_declarator > identifier.
  let declarator = node.childForFieldName('declarator');
  while (declarator?.childForFieldName('declarator')) declarator = declarator.childForFieldName('declarator');
  if (declarator) return declarator.text;

  return namedChildren(node).find((child) => NAME_LIKE_NODE_TYPE.test(child.type))?.text;
}

function hasPublicModifier(node: Node) {
  return namedChildren(node).some((child) => VISIBILITY_NODE_TYPE.test(child.type) && PUBLIC_KEYWORD.test(child.text));
}

function isExported(node: Node, name: string, grammar: Grammar) {
  let ancestor: Node | null = node;
  for (let depth = 0; depth < 3 && ancestor; depth += 1) {
    if (ancestor.type === 'export_statement') return true;
    ancestor = ancestor.parent;
  }
  if (hasPublicModifier(node)) return true;
  if (grammar === GRAMMARS.GO) return /^[A-Z]/.test(name);
  if (grammar === GRAMMARS.PYTHON) return !name.startsWith('_');
  return false;
}

/**
 * First line of the declaration including decorators, `export`, the `const` of `const fn = () => {}`,
 * and the comments written right above it at the same indentation.
 */
function startRow(node: Node) {
  let outer = node;
  let { parent } = node;
  for (let depth = 0; depth < 3 && parent; depth += 1) {
    const isWrapper =
      parent.type === 'export_statement' ||
      parent.type === 'decorated_definition' ||
      parent.type === 'lexical_declaration' ||
      parent.type === 'variable_declaration';
    if (!isWrapper) break;
    outer = parent;
    parent = parent.parent;
  }

  let row = Math.min(node.startPosition.row, outer.startPosition.row);
  let previous = outer.previousNamedSibling;
  while (
    previous &&
    previous.type.includes('comment') &&
    previous.endPosition.row === row - 1 &&
    previous.startPosition.column === outer.startPosition.column
  ) {
    row = previous.startPosition.row;
    previous = previous.previousNamedSibling;
  }
  return row;
}

interface iDeclarationDraft {
  name: string;
  symbolKind: SymbolKind;
  isFunctionLike: boolean;
}

function describeNode(node: Node, grammar: Grammar, containers: string[], isInsideFunction: boolean) {
  const { type } = node;

  if (FUNCTION_NODE_TYPES.has(type)) {
    const isMethod = containers.length > 0 || type.includes('method');
    return {
      name: nameOf(node) ?? '(anonymous)',
      symbolKind: isMethod ? SYMBOL_KINDS.METHOD : SYMBOL_KINDS.FUNCTION,
      isFunctionLike: true,
    } satisfies iDeclarationDraft;
  }

  const containerKind = CONTAINER_SYMBOL_KINDS[type];
  if (containerKind) {
    const name = nameOf(node);
    return name ? ({ name, symbolKind: containerKind, isFunctionLike: false } satisfies iDeclarationDraft) : undefined;
  }

  if (ASSIGNMENT_NODE_TYPES.has(type)) {
    const value = node.childForFieldName('value') ?? node.childForFieldName('right');
    const key =
      node.childForFieldName('name') ??
      node.childForFieldName('key') ??
      node.childForFieldName('property') ??
      node.childForFieldName('left');
    if (!key) return undefined;
    if (value && FUNCTION_VALUE_TYPES.has(value.type)) {
      return {
        name: key.text,
        symbolKind: containers.length > 0 ? SYMBOL_KINDS.METHOD : SYMBOL_KINDS.FUNCTION,
        isFunctionLike: true,
      } satisfies iDeclarationDraft;
    }
    // Multi-line top-level constants (config objects, lookup tables) are reviewable on their own.
    const isTopLevelBinding = type === 'variable_declarator' || (type === 'assignment' && grammar === GRAMMARS.PYTHON);
    const isMultiLine = node.endPosition.row > node.startPosition.row;
    if (isTopLevelBinding && isMultiLine && containers.length === 0 && !isInsideFunction) {
      return { name: key.text, symbolKind: SYMBOL_KINDS.VARIABLE, isFunctionLike: false } satisfies iDeclarationDraft;
    }
    return undefined;
  }

  if (type === 'call_expression') {
    const callee = node.childForFieldName('function')?.text ?? '';
    const label = node.childForFieldName('arguments')?.namedChildren[0];
    if (!TEST_CALLEES.has(callee) || !label?.type.includes('string')) return undefined;
    return {
      name: `${callee}(${label.text.slice(1, -1)})`,
      symbolKind: SYMBOL_KINDS.TEST,
      isFunctionLike: !callee.startsWith('describe'),
    } satisfies iDeclarationDraft;
  }

  return undefined;
}

/** Collects the declarations in a parsed file, outermost first. */
export function extractDeclarations(root: Node, grammar: Grammar): iDeclaration[] {
  const declarations: iDeclaration[] = [];

  const visit = (node: Node, containers: string[], isInsideFunction: boolean) => {
    if (node.type === 'type_declaration' && grammar === GRAMMARS.GO) {
      for (const spec of namedChildren(node)) {
        const name = spec.type === 'type_spec' ? spec.childForFieldName('name')?.text : undefined;
        if (!name) continue;
        declarations.push({
          name,
          path: [...containers, name].join('.'),
          symbolKind: SYMBOL_KINDS.TYPE,
          isFunctionLike: false,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          isExported: isExported(spec, name, grammar),
        });
      }
      return;
    }

    const draft = describeNode(node, grammar, containers, isInsideFunction);
    let nextContainers = containers;
    if (draft) {
      let path = [...containers, draft.name].join('.');
      if (grammar === GRAMMARS.GO && node.type === 'method_declaration') {
        const receiver = /\*?(\w+)\s*\)/.exec(node.childForFieldName('receiver')?.text ?? '')?.[1];
        if (receiver) path = `${receiver}.${draft.name}`;
      }
      declarations.push({
        ...draft,
        path,
        startLine: startRow(node) + 1,
        endLine: node.endPosition.row + 1,
        isExported: isExported(node, draft.name, grammar),
      });
      nextContainers = [...containers, draft.name];
    }

    const isChildInsideFunction = isInsideFunction || draft?.isFunctionLike === true;
    for (const child of namedChildren(node)) visit(child, nextContainers, isChildInsideFunction);
  };

  visit(root, [], false);
  return declarations;
}

function lineSpan(declaration: iDeclaration) {
  return declaration.endLine - declaration.startLine;
}

/**
 * The declaration a changed line belongs to: the innermost function-like one, else the innermost
 * other declaration, where classes, impls and modules only count when they are small.
 */
export function findOwner(declarations: readonly iDeclaration[], line: number): iDeclaration | undefined {
  let owningFunction: iDeclaration | undefined;
  let owningOther: iDeclaration | undefined;

  for (const declaration of declarations) {
    if (line < declaration.startLine || line > declaration.endLine) continue;
    if (declaration.isFunctionLike) {
      if (!owningFunction || lineSpan(declaration) < lineSpan(owningFunction)) owningFunction = declaration;
    } else if (!owningOther || lineSpan(declaration) < lineSpan(owningOther)) {
      owningOther = declaration;
    }
  }

  if (owningFunction) return owningFunction;
  if (!owningOther) return undefined;
  const isBroad = BROAD_SYMBOL_KINDS.has(owningOther.symbolKind);
  return !isBroad || lineSpan(owningOther) <= SMALL_CONTAINER_LINES ? owningOther : undefined;
}

/** The innermost declaration of any kind around a line, used to name sections inside large classes. */
export function findEnclosing(declarations: readonly iDeclaration[], line: number): iDeclaration | undefined {
  let enclosing: iDeclaration | undefined;
  for (const declaration of declarations) {
    if (line < declaration.startLine || line > declaration.endLine) continue;
    if (!enclosing || lineSpan(declaration) < lineSpan(enclosing)) enclosing = declaration;
  }
  return enclosing;
}
