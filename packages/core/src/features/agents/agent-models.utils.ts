import { isSafeAgentModel } from '@chaff/common/helpers/agent-model.helper';

export interface iAgentModelOption {
  id: string;
  label?: string;
}

export interface iParsedModelList {
  models: iAgentModelOption[];
  /** The model the agent marks as its default, when it marks one. */
  defaultModel?: string;
}

interface iModelEntry extends iAgentModelOption {
  isHidden: boolean;
  isDefault: boolean;
}

/** Fields an entry's id may come under, in order of preference. */
const ID_FIELDS = ['slug', 'model', 'id', 'name'];
const LABEL_FIELDS = ['display_name', 'displayName', 'label', 'title'];
const LIST_FIELDS = ['models', 'data', 'presets', 'items'];
/** Cell values that mark a model hidden (in a `hidden` or `visibility` column) or the default. */
const HIDDEN_WORDS = new Set(['hidden', 'hide', 'none', 'true', 'yes', 'y', 'x']);
const DEFAULT_WORDS = new Set(['default', 'true', 'yes', 'y', 'x', '*']);
const HIDDEN_MARK = /\((?:hidden)\)|\[(?:hidden)\]|\bhidden\s*$|\bhidden\s*[:=]\s*(?:true|yes)\b/i;
const DEFAULT_MARK = /\(default\)|\[default\]/i;
/** Box drawing and table borders that some CLIs print around rows. */
const TABLE_BORDER = /[│┃|┆┊║]/;
const SEPARATOR_ROW = /^[\s\-=+─━┼┤├┬┴┌┐└┘╭╮╰╯:|│]*$/;

/** A plausible model id: one safe token with a digit or a dash, so headings and prose are left out. */
function isModelId(candidate: string) {
  return isSafeAgentModel(candidate) && /[\d-]/.test(candidate) && /[a-z]/i.test(candidate);
}

function stringField(record: Record<string, unknown>, fields: readonly string[]) {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function isHiddenRecord(record: Record<string, unknown>) {
  if (record.hidden === true || record.is_hidden === true || record.isHidden === true) return true;
  if (record.show_in_picker === false || record.showInPicker === false || record.visible === false) return true;
  const { visibility } = record;
  return typeof visibility === 'string' && HIDDEN_WORDS.has(visibility.trim().toLowerCase());
}

function entryFromJson(value: unknown, key?: string): iModelEntry | undefined {
  if (typeof value === 'string') return { id: value.trim(), isHidden: false, isDefault: false };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const id = stringField(record, ID_FIELDS) ?? key;
  if (!id) return undefined;
  const label = stringField(record, LABEL_FIELDS);
  return {
    id,
    label: label && label !== id ? label : undefined,
    isHidden: isHiddenRecord(record),
    isDefault: record.is_default === true || record.isDefault === true || record.default === true,
  };
}

function entriesFromJson(value: unknown): iModelEntry[] | undefined {
  if (Array.isArray(value)) return value.flatMap((item) => entryFromJson(item) ?? []);
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  for (const field of LIST_FIELDS) {
    if (Array.isArray(record[field])) return entriesFromJson(record[field]);
  }
  // A map keyed by model id.
  return Object.entries(record).flatMap(([key, item]) =>
    item && typeof item === 'object' && !Array.isArray(item) ? (entryFromJson(item, key) ?? []) : [],
  );
}

function parseJson(output: string) {
  try {
    return entriesFromJson(JSON.parse(output));
  } catch {
    // Not one JSON document; it may be one JSON object per line.
  }
  const lines = output.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0 || !lines.every((line) => line.trim().startsWith('{'))) return undefined;
  try {
    return lines.flatMap((line) => entryFromJson(JSON.parse(line)) ?? []);
  } catch {
    return undefined;
  }
}

function splitColumns(line: string) {
  const cells = TABLE_BORDER.test(line) ? line.split(TABLE_BORDER) : line.trim().split(/\t|\s{2,}/);
  return cells.map((cell) => cell.trim()).filter((cell, index, all) => cell || (index > 0 && index < all.length - 1));
}

/** Text output: one model per line, maybe as a table with a header row naming a hidden or visibility column. */
function parseText(output: string): iModelEntry[] {
  const entries: iModelEntry[] = [];
  let hiddenColumn: number | undefined;
  let defaultColumn: number | undefined;
  for (const rawLine of output.split(/\r?\n/)) {
    if (!rawLine.trim() || SEPARATOR_ROW.test(rawLine)) continue;
    const cells = splitColumns(rawLine);
    const lowered = cells.map((cell) => cell.toLowerCase());
    if (lowered.some((cell) => ['id', 'model', 'slug', 'name'].includes(cell))) {
      const hiddenAt = lowered.findIndex((cell) => cell === 'hidden' || cell === 'visibility');
      const defaultAt = lowered.findIndex((cell) => cell === 'default' || cell === 'is_default');
      hiddenColumn = hiddenAt === -1 ? undefined : hiddenAt;
      defaultColumn = defaultAt === -1 ? undefined : defaultAt;
      continue;
    }
    const first = cells[0]?.replace(/^(?:[-•]|\d+[.)])\s+/, '') ?? '';
    const isStarred = first.startsWith('*');
    const id =
      first
        .replace(/^\*\s*/, '')
        .split(/\s+/)[0]
        ?.replace(/[,:;]$/, '') ?? '';
    if (!isModelId(id)) continue;
    const hiddenCell = hiddenColumn === undefined ? undefined : lowered[hiddenColumn];
    const defaultCell = defaultColumn === undefined ? undefined : lowered[defaultColumn];
    entries.push({
      id,
      isHidden: hiddenCell === undefined ? HIDDEN_MARK.test(rawLine.trim()) : HIDDEN_WORDS.has(hiddenCell),
      isDefault:
        isStarred || DEFAULT_MARK.test(rawLine) || (defaultCell !== undefined && DEFAULT_WORDS.has(defaultCell)),
    });
  }
  return entries;
}

/**
 * Reads the models out of an agent's model listing, whatever its shape: a JSON array or object (with a `models`
 * list, or keyed by id), JSON lines, or text with one model per line or a table. Hidden models and anything that
 * cannot be passed as one model id are left out.
 */
export function parseModelList(output: string): iParsedModelList {
  const entries = parseJson(output.trim()) ?? parseText(output);
  const seen = new Set<string>();
  const models: iAgentModelOption[] = [];
  let defaultModel: string | undefined;
  // A list that marks every entry (a `*` bullet list) marks none as the default.
  const isDefaultMarked = entries.length < 2 || entries.some((entry) => !entry.isDefault);
  for (const entry of entries) {
    if (entry.isHidden || !isSafeAgentModel(entry.id) || seen.has(entry.id)) continue;
    seen.add(entry.id);
    models.push(entry.label ? { id: entry.id, label: entry.label } : { id: entry.id });
    if (entry.isDefault && isDefaultMarked) defaultModel ??= entry.id;
  }
  return { models, defaultModel };
}

/** The top-level `model = "..."` of a TOML configuration such as `~/.codex/config.toml`. */
export function parseTomlModel(toml: string) {
  for (const line of toml.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[')) return undefined;
    const match = /^model\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(trimmed);
    const model = match?.[1] ?? match?.[2];
    if (model !== undefined) return model.trim() || undefined;
  }
  return undefined;
}
