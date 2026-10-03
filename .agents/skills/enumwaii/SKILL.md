---
name: enumwaii
description: >
  Mandatory: declare and consume closed sets of string values with the npm
  package enumwaii, never z.enum or raw string unions. Read before working on enums.
---

# Enumwaii

Use the npm package `enumwaii` for closed sets of string values. Keep genuinely open-ended data as `string`. The shared ESLint configuration uses the npm package `eslint-plugin-enumwaii`.

## Declarations and boundaries

Declare enums with `em`, then export the member accessor, inferred type, and a Zod adapter when a contract or form needs one. Shared enums belong in `packages/common/src/enums/<name>.enums.ts`; feature-local enums stay with their feature.

```ts
import { em, type InferEnumwaii } from "enumwaii";
import { emToZodSchema } from "enumwaii/zod";

const storyStageModesEnumwaii = em(["REGULAR", "READER", "CINEMATIC"]);
export const STORY_STAGE_MODES = storyStageModesEnumwaii.enum;
export type StoryStageMode = InferEnumwaii<typeof storyStageModesEnumwaii>;
export const storyStageModeSchema = emToZodSchema(storyStageModesEnumwaii);
```

Internal values use `CONSTANT_CASE`. Preserve the spelling of external wire contracts, URL values, provider IDs, and other intentional exceptions. Do not rename persisted values as part of a dependency migration.

Use exported accessor members for defaults, comparisons, payloads, and fixtures. Never use raw strings or `schema.enum.VALUE` at call sites. Validate unknown data with the Zod schema or the declaration's `parse`, `safeParse`, or `is` methods. The declaration itself implements Standard Schema for consumers that support it.

```ts
const mode = storyStageModesEnumwaii.parse(input);
if (mode === STORY_STAGE_MODES.READER) {
  enableReaderLayout();
}
```

The package derives type identity from the complete set of raw values. Declarations with equal sets are compatible; a declaration name is not an identity boundary. `pick`, `omit`, and `extend` preserve the parent identity; `em.combine` derives identity from the resulting set. Members remain strings at runtime.

## Exhaustive metadata

Use `derive` with tuple entries and read mappings through `.get`. Use its curried generic overload to contextually type object or function values.

```ts
const STORY_STAGE_MODE_LABELS = storyStageModesEnumwaii.derive(
  [STORY_STAGE_MODES.REGULAR, "Regular"],
  [STORY_STAGE_MODES.READER, "Reader"],
  [STORY_STAGE_MODES.CINEMATIC, "Cinematic"],
);
const label = STORY_STAGE_MODE_LABELS.get(mode);

const NOTES = storyStageModesEnumwaii.derive<string | undefined>()(
  [STORY_STAGE_MODES.REGULAR, undefined],
  [STORY_STAGE_MODES.READER, "Reading layout"],
  [STORY_STAGE_MODES.CINEMATIC, "Full screen"],
);
```

Use `derive((member) => ...)` when every value is computed by the same function. Use `.record` only for raw-keyed object iteration or interoperability. A derived mapping is not callable. Do not add wrappers for the former API.

## Composition

```ts
const readingModes = storyStageModesEnumwaii.pick([
  STORY_STAGE_MODES.READER,
  STORY_STAGE_MODES.CINEMATIC,
]);
```

Use `pick`, `omit`, `extend`, or `em.combine` when composing related domains. Do not duplicate member lists merely to create a subset.

## ESLint

Keep both existing rules enabled in the shared configuration:

```js
import {
  noRawEnumComparisonRule,
  noRawEnumMemberRule,
} from "eslint-plugin-enumwaii";

const rules = {
  "no-raw-enum-comparison": noRawEnumComparisonRule,
  "no-raw-enum-member": noRawEnumMemberRule,
};
```

Register those under the `enumwaii` plugin name and set `enumwaii/no-raw-enum-comparison` and `enumwaii/no-raw-enum-member` to `error`. Use owned members in tuple keys, subset operations, comparisons, and switch cases.

## Drizzle, contracts, and serialization

- Use exported Zod adapter schemas in oRPC contracts and forms. For agent JSON Schema exports, validate representable input and brand it with the declaration: `z.literal(declaration.rawValues).transform((value) => declaration.parse(value))`, then export with `io: "input"`. This retains the allowed values and branded parsing without allowing unrepresentable schemas as unconstrained JSON.
- SQLite columns use `.$type<T>()` for their branded application type. This is compile-time only; parse database strings in resolver overrides before returning them.
- JSON transports preserve string values but cannot prove their validity. Validate at input boundaries.
- Output contracts type responses but do not validate runtime outputs in this repository (`initialOutputValidationIndex: Number.NaN`).

See the [published API documentation](https://catofjupit3r.github.io/enumwaii/docs/api/enumwaii/) for the full reference.
