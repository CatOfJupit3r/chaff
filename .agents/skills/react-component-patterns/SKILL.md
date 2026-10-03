---
name: react-component-patterns
description: Create React components following project conventions for UI composition, accessibility, and styling. Use when building new UI components, forms with validation, accessible interactive elements, avoiding giant prop drilling, using slot-based composition, deriving child prop types from hooks with ReturnType or Pick, composing from existing UI primitives, managing URL state with nuqs, or handling loading and error states.
---

# React Component Patterns

## Core Principles

- **Compose from UI primitives** - Use `@~/components/ui/*` instead of building from scratch
- **Type safety** - Interface props with `i` prefix convention
- **Design tokens** - Use Tailwind tokens (`bg-canvas`, `text-muted`) never hardcoded colors
- **Accessibility first** - Semantic HTML, ARIA labels, keyboard navigation
- **Handle all states** - Loading (skeletons), error (alerts/boundaries), empty, success
- **URL state sync** - Use nuqs for filters, pagination, sorting

## Enumwaii requirement

Use `Enumwaii` for every closed set used by a component, hook, URL state, select, default, or test fixture. Import the owning accessor and use members such as `SETTINGS_TABS.ACCOUNT`; do not introduce `z.enum`, raw string unions, duplicated literals, or `Record<string, ...>` maps for enum-backed values. Use the enumwaii `.schema` in form validation and computed keys in metadata maps (`{ [SETTINGS_TABS.ACCOUNT]: ... }`).

## Size And Composition Limits

These are hard limits for `apps/web` components. Treat them as refactor triggers, not suggestions.

- **Max 200 lines per `.tsx` file** - Target 120-160 lines. Split any file that grows past 200 lines. Exception: if the only way to get under the limit is a pass-through wrapper or a giant drilled prop interface, keep the better composition and tolerate a modest overage. Files past 250 lines should still be treated as architecture debt and broken apart before adding new behavior.
- **Max 2 React component declarations per file** - Default to one exported component plus at most one tiny private helper. If you need more, move them into sibling files.
- **No component declarations inside component bodies** - Never define `function`, `const Component = () =>`, or memoized JSX components inside another component. Extract them to sibling files.
- **State view files belong in dedicated shared files** - Empty, error, skeleton, loading, and not-found states go in files like `empty-components.tsx`, `error-components.tsx`, `skeleton-components.tsx`, or a slice-specific equivalent such as `story-detail-skeleton-components.tsx`.
- **Max 5 hooks per component** - Count `useState`, `useReducer`, `useEffect`, `useMemo`, `useCallback`, `useRef`, and custom hooks. If you need more, extract a feature hook or split the component.
- **Max 2 stateful hooks per parent container** - More than two pieces of local state usually means orchestration belongs in a hook.
- **Max 2 memoization hooks total** - If you reach more than one `useMemo` and one `useCallback` in the same file, stop and extract logic instead of stacking memoization.
- **Max 3 top-level conditional UI branches** - If render logic contains more than loading/error/empty plus success, move state branches into dedicated components.
- **Max 4 visually distinct sections in one render tree** - Headers, sidebars, forms, lists, dialogs, inspectors, and footers should be composed from child components rather than built inline in one parent.

### Refactor Triggers

Refactor immediately when any of these show up:

- More than one inline helper component in a parent file
- Repeated JSX blocks with only minor prop differences
- More than 25 lines of JSX in a single return branch
- More than one dialog, card, or panel implementation in the same file
- Utility formatting helpers mixed into a component file instead of a `.utils.ts` file
- More than one effect coordinating the same piece of state
- A component mostly forwards a large data-and-callback bundle to one child instead of owning the layout directly
- A props interface becomes a transport object for one parent-child relationship rather than a real component contract

### How To Stay Under The Limits

- Extract orchestration into `hooks/use-<feature>-state.ts` or `hooks/use-<feature>-controller.ts`
- Keep route/container components focused on query selection and wiring callbacks
- Move presentational sections into `components/<slice>/<slice>-section.tsx`, `*-card.tsx`, `*-dialog.tsx`, or `*-panel.tsx`
- Move derived labels, formatting, and option mapping into `*.utils.ts`
- Group shared state views under dedicated files instead of declaring them beside the main feature component
- Prefer composition over prop transport. If a child only exists to receive a wide prop surface from one parent, reconsider the boundary.
- Use slot-based composition when a shared layout shell is still useful, but merge thin shells back into the owner when they only forward sections without adding real behavior.
- Prefer a small line-limit overage to introducing giant prop drilling, fake abstractions, or layout wrappers whose only job is forwarding props.

### Prop Drilling And Ownership

- Do not create intermediary components whose main job is forwarding 8-10+ props, callbacks, and loading flags into one child tree.
- If the parent owns the route state, mutation wiring, and page layout, it should usually render the major sections directly.
- If the layout shell is genuinely reusable, use slot-based composition instead of one giant interface for hero, actions, dialogs, and side sections.
- If the shell stops adding value and only re-exports slots, merge it back into the owner and keep the orchestration extracted in a feature hook.
- Passing a small, coherent prop set through one level is fine. Passing a whole page contract through multiple levels is not.

### State Component File Pattern

```text
apps/web/src/features/workspaces/components/
  reviews-screen.tsx
  local-stacks-group.tsx
  repositories-group.tsx
  repository-row.tsx
  remove-repository-dialog.tsx
  stack-row.tsx
  branch-chain.tsx
  skeleton-components.tsx    # StackRowsSkeleton
  error-components.tsx       # BranchesErrorRow
  empty-components.tsx       # NoRepositories, NoLocalStacks
```

Rules for shared state files:

- Keep them focused on one feature or one slice of a feature
- Keep each state component small and presentation-only
- Do not place fetch logic, mutation logic, or feature orchestration in these files
- If a shared state file grows beyond 120 lines or needs unrelated variants, split it again

## Component Structure

### Prop And Callback Typing

- Treat feature hooks and local controller hooks as the source of truth for child callback and state prop types.
- Export `type FeatureController = ReturnType<typeof useFeatureController>` when a slice has multiple child components consuming the same local behavior.
- If a child consumes a named subset of that controller, prefer `interface iChildProps extends Pick<FeatureController, 'handleSave' | 'isSaving'>` over rewriting callback signatures by hand.
- Keep the picked property names when the child is a direct controller-backed consumer. This preserves traceability from the hook return shape to the child API.
- Use indexed access like `FeatureController['handleSave']` when only one prop needs to reference the controller type.
- Use `Parameters<>` and `ReturnType<>` when the parent intentionally adapts a controller method instead of forwarding it directly.
- Do not overfit generic shared components to one specific hook/controller. If the component is reused for multiple variants, keep the prop types generic enough for all of them.
- If a child prop name differs from the controller method, that difference should reflect a real behavioral adaptation, not just a local naming preference.

### Interface Naming Convention

**ALWAYS** prefix component props interfaces with `i`:

```typescript
interface iRepositoriesGroupProps {
  workspaces: readonly iWorkspace[];
  onAdd: () => void;
  isAdding: boolean;
}

export function RepositoriesGroup({ workspaces, onAdd, isAdding }: iRepositoriesGroupProps) {
  // Component implementation
}
```

### Feature Organization

```
apps/web/src/features/workspaces/
  components/
    reviews-screen.tsx
    repository-row.tsx
    empty-components.tsx
    ...
  hooks/
    use-workspaces.ts          # Query options + query hook
    use-add-workspace.ts
    use-remove-workspace.ts
    use-local-stacks.ts
  local-stacks.utils.ts        # Pure helpers
  workspaces.types.ts          # Types from ORPCOutputs
```

There are no `index.ts` barrels. Routes and other features import from the owning file:

```typescript
// routes/index.tsx
import { ReviewsScreen } from '@~/features/workspaces/components/reviews-screen';
import { workspacesQueryOptions } from '@~/features/workspaces/hooks/use-workspaces';
```

### Container vs Presentational Split

Use this split by default for non-trivial feature UI:

- **Container components** own data loading, URL state, and mutation wiring
- **Presentational components** receive data and callbacks, render markup, and stay mostly stateless
- **Feature hooks** own multi-step local state, effects, derived values, keyboard handlers, and action orchestration
- **State components** render empty, error, skeleton, and not-found views from dedicated shared files

If a component needs both heavy orchestration and a large render tree, that is two responsibilities. Split it.

## UI Composition

### Available Primitives

Common primitives from `@~/components/ui`:

- **Layout**: `List`, `ListRow`, `SectionLabel`; screens use `Screen` and `TopBar` from `@~/components/layout`
- **Controls**: `Button` (variants `default`, `primary`, `ghost`, `icon`; sizes `default`, `sm`, `icon`), `SegmentedControl`, `Field` (labelled row)
- **Feedback**: `Callout` (`warn`, `info`), `Pill` (`open`, `fix`, `ok`, `out`, `question`, `neutral`), `showToast` from `@~/components/toast/toast-store`
- **Overlay**: `Dialog`, `DialogContent`, `DialogHeader` (`title`, `description`), `DialogBody`, `DialogFooter`, `DialogClose` (Base UI)
- **Brand and icons**: `Logo`; icons such as `FolderIcon`, `CloseIcon`, `SunIcon` from `@~/components/icons/icons`, built with `createIcon`

If a primitive is missing, add it to `components/ui` (Base UI for behavior, theme tokens for color) instead of building it inside a feature.

### Composition Pattern

```typescript
// features/workspaces/components/repository-row.tsx
import { useState } from 'react';

import { FolderIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { ListRow } from '@~/components/ui/list';
import { Pill } from '@~/components/ui/pill';

import type { iWorkspace } from '../workspaces.types';
import { RemoveRepositoryDialog } from './remove-repository-dialog';

export function RepositoryRow({ workspace }: { workspace: iWorkspace }) {
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  return (
    <ListRow>
      <div className="flex min-w-0 items-start gap-3">
        <FolderIcon className="mt-[3px] text-faint" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            {workspace.name}
            {workspace.isAvailable ? null : <Pill variant="open">folder missing</Pill>}
          </div>
          <div className="mt-[3px] truncate font-mono text-[12px] text-muted" title={workspace.repoPath}>
            {workspace.repoPath}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {workspace.defaultBranch ? (
          <span className="font-mono text-[12px] text-muted" title="Default branch">
            {workspace.defaultBranch}
          </span>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => setIsRemoveOpen(true)}>
          Remove
        </Button>
      </div>
      <RemoveRepositoryDialog workspace={workspace} isOpen={isRemoveOpen} onOpenChange={setIsRemoveOpen} />
    </ListRow>
  );
}
```

## Forms

**→ See `.agents/skills/tanstack-forms/SKILL.md` for comprehensive form patterns.**

Quick reference - use `useAppForm` with Zod validation (the form hook is added with the first form; see that skill):

```typescript
import z from 'zod';
import { useAppForm } from '@~/components/ui/field';
import { useCreateCharacter } from '../hooks/use-create-character';

const characterSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
});

export function CreateCharacterForm() {
  const { mutate: createCharacter } = useCreateCharacter();

  const form = useAppForm({
    defaultValues: { name: '' },
    validators: { onSubmit: characterSchema },
    onSubmit: ({ value }) => createCharacter(value),
  });

  return (
    <form.AppForm>
      <form.Form className="space-y-4">
        <form.AppField name="name">
          {(field) => <field.TextField label="Character Name" />}
        </form.AppField>
        <form.SubmitButton>Create</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
```

## Data Fetching & State Management

**→ See `.agents/skills/tanstack-query-integration/SKILL.md` for query/mutation patterns.**

### Loading States

**Always import skeletons from dedicated shared files** - never declare them inline in the main component file:

```typescript
// features/workspaces/components/local-stacks-group.tsx
import { List } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';

import { useLocalStacks } from '../hooks/use-local-stacks';
import type { iWorkspace } from '../workspaces.types';
import { NoLocalStacks } from './empty-components';
import { BranchesErrorRow } from './error-components';
import { StackRowsSkeleton } from './skeleton-components';
import { StackRow } from './stack-row';

export function LocalStacksGroup({ workspaces }: { workspaces: readonly iWorkspace[] }) {
  const { isPending, failures, stacks } = useLocalStacks(workspaces);
  const isEmpty = !isPending && failures.length === 0 && stacks.length === 0;

  return (
    <section aria-label="Local stacks" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>Local stacks</SectionLabel>
        <SectionLabel>Commits</SectionLabel>
      </div>
      <List>
        {failures.map(({ workspace, error }) => (
          <BranchesErrorRow key={workspace.id} workspace={workspace} error={error} />
        ))}
        {isPending ? <StackRowsSkeleton /> : null}
        {stacks.map((stack) => (
          <StackRow key={`${stack.workspace.id}:${stack.tip.name}`} stack={stack} />
        ))}
        {isEmpty ? <NoLocalStacks /> : null}
      </List>
    </section>
  );
}
```

Example dedicated state file:

```typescript
// skeleton-components.tsx
import { ListRow } from '@~/components/ui/list';

const PLACEHOLDER_ROWS = 3;

export function StackRowsSkeleton() {
  return Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
    <ListRow key={index} aria-hidden="true" className="hover:bg-transparent">
      <div className="flex flex-col gap-2">
        <span className="h-3.5 w-48 animate-pulse rounded-sm bg-raised" />
        <span className="h-3 w-72 animate-pulse rounded-sm bg-raised" />
      </div>
      <span className="h-3 w-16 animate-pulse rounded-sm bg-raised" />
    </ListRow>
  ));
}
```

```typescript
// error-components.tsx
import { AlertIcon } from '@~/components/icons/icons';
import { ListRow } from '@~/components/ui/list';
import { getErrorMessage } from '@~/utils/rpc-errors';

import type { iWorkspace } from '../workspaces.types';

interface iBranchesErrorRowProps {
  workspace: iWorkspace;
  error: unknown;
}

export function BranchesErrorRow({ workspace, error }: iBranchesErrorRowProps) {
  return (
    <ListRow className="hover:bg-transparent">
      <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
        <AlertIcon className="text-bad" />
        <span className="truncate">
          Could not read the branches of {workspace.name}: {getErrorMessage(error)}
        </span>
      </div>
      <span />
    </ListRow>
  );
}
```

### Error Handling

**Route-level errors** - Handled by `RouteError` and `RouteNotFound` from `@~/components/layout`:

```typescript
// router.tsx
return createRouter({
  routeTree,
  context: { tanstackRPC, queryClient },
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: RouteNotFound,
});
```

**Operation feedback** - UI changes should be the primary feedback:

```typescript
// GOOD - Optimistic update in useUpdateSettings: the control changes at once and rolls back on error
function ThemeField() {
  const settings = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();

  return (
    <SegmentedControl
      label="Theme"
      options={THEME_MODE_OPTIONS}
      value={settings.theme}
      onChange={(theme) => updateSettings({ theme })}
    />
  );
}

// BAD - Toast spam, no visual feedback of change
function handleThemeChange(theme: ThemeMode) {
  updateSettings(
    { theme },
    {
      onSuccess: () => showToast('Theme saved'), // Nothing on screen shows what changed!
    }
  );
}
```

**Toast notifications** - **Only use when UI cannot show the change:**

```typescript
import { showToast } from '@~/components/toast/toast-store';

// Appropriate: a failed call has no inline place to show it (every mutation hook)
onError: (error) => showToast(getErrorMessage(error)),

// Appropriate: confirming a change made in a dialog that just closed
onSuccess: () => {
  onOpenChange(false);
  showToast(`Removed ${workspace.name}`);
},

// Appropriate: Copy to clipboard confirmation
const handleCopy = async () => {
  await navigator.clipboard.writeText(text);
  showToast('Copied to clipboard');
};
```

`showToast` shows one short message at a time; a newer message replaces the current one.

**→ See `.agents/skills/tanstack-query-integration/SKILL.md` for optimistic update patterns.**
**→ See `.agents/skills/server-error-handling/SKILL.md` for error codes and handling patterns.**

## URL State Management

Declare workflow steps and other closed UI state with `Enumwaii`; compare against accessor members rather than raw step strings. Use the enumwaii schema for validation and `.rawValues` only when a URL library requires plain strings.

Use nuqs for shareable, bookmarkable UI state (filters, tabs, modals):

```typescript
import { parseAsStringEnum, useQueryState } from 'nuqs';
import { Enumwaii } from '@chaff/enumwaii/enumwaii';

import { SegmentedControl } from '@~/components/ui/segmented-control';

// These values are intentionally lowercase because they are URL-facing.
const settingsTabsEnumwaii = new Enumwaii('SettingsTab', ['appearance', 'editor', 'repositories']);
const SETTINGS_TABS = settingsTabsEnumwaii.enum;
const SETTINGS_TAB_LABELS = settingsTabsEnumwaii.derive({
  [SETTINGS_TABS.appearance]: 'Appearance',
  [SETTINGS_TABS.editor]: 'Editor',
  [SETTINGS_TABS.repositories]: 'Repositories',
});
const SETTINGS_TAB_OPTIONS = settingsTabsEnumwaii.values.map((value) => ({
  value,
  label: SETTINGS_TAB_LABELS(value),
}));

export function SettingsTabs() {
  const [tab, setTab] = useQueryState(
    'tab',
    parseAsStringEnum([...settingsTabsEnumwaii.values]).withDefault(SETTINGS_TABS.appearance)
  );

  return (
    <SegmentedControl
      label="Settings section"
      options={SETTINGS_TAB_OPTIONS}
      value={tab}
      onChange={(value) => void setTab(value)}
    />
  );
}
```

### Multiple Query States

```typescript
import { useQueryStates, parseAsString, parseAsInteger } from 'nuqs';

export function ResourceList() {
  const [{ search, page }, setParams] = useQueryStates({
    search: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });

  return (
    <div>
      <input
        value={search}
        onChange={(e) => void setParams({ search: e.target.value || null, page: 1 })}
      />
      <Pagination
        page={page}
        onPageChange={(p) => void setParams({ page: p })}
      />
    </div>
  );
}
```

**Setup** - `NuqsAdapter` already wraps the app in `routes/__root.tsx`:

```typescript
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';

<NuqsAdapter>
  <AppShell>
    <Outlet />
  </AppShell>
  <ToastViewport />
</NuqsAdapter>
```

## Dialog State Management

Dialogs should reset state when closing:

```typescript
import { Dialog, DialogBody, DialogContent, DialogHeader } from '@~/components/ui/dialog';
import { useState } from 'react';

interface iCreateDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function CreateDialog({ isOpen, onOpenChange }: iCreateDialogProps) {
  const [formData, setFormData] = useState({ name: '' });
  const { mutate: create, reset: resetMutation } = useCreate();

  const handleClose = () => {
    setFormData({ name: '' }); // Reset local state
    resetMutation();            // Reset mutation state
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader title="Create Resource" />
        <DialogBody>{/* Form implementation */}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}
```

## Multi-Step Wizards

Use state machine pattern for wizard flows, with the steps declared as an `Enumwaii`:

```typescript
const wizardStepsEnumwaii = new Enumwaii('WizardStep', ['SELECT_TYPE', 'CONFIGURE', 'CONFIRM']);
const WIZARD_STEPS = wizardStepsEnumwaii.enum;
type WizardStep = InferEnumwaii<typeof wizardStepsEnumwaii>;

export function SetupWizard() {
  const [step, setStep] = useState<WizardStep>(WIZARD_STEPS.SELECT_TYPE);
  const [config, setConfig] = useState<Config | null>(null);

  const handleBack = () => {
    if (step === WIZARD_STEPS.CONFIRM) setStep(WIZARD_STEPS.CONFIGURE);
    if (step === WIZARD_STEPS.CONFIGURE) setStep(WIZARD_STEPS.SELECT_TYPE);
  };

  const handleNext = () => {
    if (step === WIZARD_STEPS.SELECT_TYPE) setStep(WIZARD_STEPS.CONFIGURE);
    if (step === WIZARD_STEPS.CONFIGURE) setStep(WIZARD_STEPS.CONFIRM);
  };

  return (
    <DialogBody>
      {step === WIZARD_STEPS.SELECT_TYPE && <SelectTypeStep onNext={handleNext} />}
      {step === WIZARD_STEPS.CONFIGURE && <ConfigureStep onBack={handleBack} onNext={handleNext} />}
      {step === WIZARD_STEPS.CONFIRM && <ConfirmStep onBack={handleBack} onComplete={handleComplete} />}
    </DialogBody>
  );
}
```

## Performance Optimizations

### Memoization Rules

- Do not add `useMemo` or `useCallback` by default just to satisfy linting or to pre-empt performance issues
- If a component needs repeated memoization to stay readable, move the logic into a hook or extract a child component
- Prefer stable child boundaries over wrapping half the parent in callbacks
- When a callback exists only to serve a single child section, move the callback and the state it touches into that child or a feature hook

### Prefetch on Hover

Prefetch data before user clicks: `createAppRouter()` sets `defaultPreload: 'intent'`, so hovering or focusing a `Link` already runs the target route's loader. Load what a screen needs in its route loader instead of adding hover handlers:

```typescript
// components/layout/app-rail.tsx: hovering this link runs the loader in routes/index.tsx
<RailLink to="/" icon={InboxIcon} label="Reviews" />
```

## Accessibility

### Semantic HTML

Use proper HTML5 elements:

```typescript
// Good
<main>
  <h1>Page Title</h1>
  <section>
    <h2>Section Title</h2>
    <article>Content</article>
  </section>
</main>

// Bad - divs everywhere
<div>
  <div>Page Title</div>
  <div><div>Content</div></div>
</div>
```

### ARIA Labels

Icon-only buttons **must** have labels:

```typescript
// Good
<Button variant="icon" size="icon" aria-label="Appearance" title="Appearance" onClick={() => setIsOpen(true)}>
  <SunIcon />
</Button>

// Bad - no label
<Button variant="icon" size="icon" onClick={() => setIsOpen(true)}>
  <SunIcon />
</Button>
```

### Focus Management

Dialog/modal components handle focus automatically via Base UI primitives. For custom focus:

```typescript
import { useEffect, useRef } from 'react';

export function SearchDialog({ isOpen }: { isOpen: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  return <input ref={inputRef} />;
}
```

## Styling Conventions

### Design Tokens

**REQUIRED** - Use design tokens, never hardcoded colors:

```typescript
// CORRECT - Design tokens
<div className="border-line bg-surface text-fg">
  <h2 className="text-2xl font-semibold">Title</h2>
  <p className="text-muted">Description</p>
  <Button className="mt-4">Action</Button>
</div>

// WRONG - Hardcoded colors
<div className="bg-white text-black border-gray-200">
  <h2 className="text-2xl font-semibold">Title</h2>
  <p className="text-gray-500">Description</p>
</div>
```

Common tokens (declared in `apps/web/src/index.css`):
- **Background**: `bg-canvas`, `bg-surface`, `bg-raised`, `bg-hover`, `bg-scrim`
- **Text**: `text-fg`, `text-fg-soft`, `text-muted`, `text-faint`; `text-code` for code (size and line height follow the setting)
- **Borders**: `border-line`, `border-line-strong`
- **Semantic**: `text-accent`, `bg-accent-soft`, `border-accent-line`, `text-good`, `bg-good-soft`, `text-warn`, `bg-warn-soft`, `text-bad`, `bg-bad-soft`; diff `bg-add-bg`, `bg-del-bg`; syntax `text-tok-*`

### Conditional Classes

Use `cn()` utility for conditional styling:

```typescript
import { cn } from '@~/lib/utils';

<Button
  className={cn(
    'size-12 transition-colors',
    isActive && 'bg-accent-soft text-accent',
    isPending && 'opacity-50 cursor-not-allowed'
  )}
>
  Click
</Button>
```

### Spacing Conventions

- **Component spacing**: `space-y-4` or `gap-4` for consistent vertical/grid spacing
- **Section padding**: `p-6` for card content, `p-4` for smaller containers
- **Margins**: Prefer gap/space utilities over margin when possible

## Anti-Patterns

Avoid these patterns in `apps/web`:

- Declaring `EmptyState`, `ErrorState`, `SkeletonState`, dialogs, cards, or section components inside the parent component body
- Large parent components that own fetching, mutation handling, keyboard shortcuts, dialog state, derived labels, and the full render tree at once
- Files that mix container logic, utility functions, and multiple presentational sections together
- Creating more callbacks and memos to manage complexity instead of extracting hooks or child components
- Returning deeply nested JSX with repeated wrappers instead of introducing a named child component
- Adding another state branch to an already crowded file instead of moving state views into shared state files
