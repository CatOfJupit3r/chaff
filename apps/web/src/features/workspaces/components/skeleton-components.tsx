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
