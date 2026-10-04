import { Button } from '@~/components/ui/button';
import { pluralize } from '@~/utils/pluralize';

import type { useStackList } from '../hooks/use-stack-list';
import { INCLUSIVE_STACK_FILTERS } from '../overview.constants';

interface iStackListFooterProps extends Pick<
  ReturnType<typeof useStackList>,
  'filteredCount' | 'hiddenCount' | 'isShowingHidden' | 'setIsShowingHidden' | 'setFilters'
> {}

export function StackListFooter({
  filteredCount,
  hiddenCount,
  isShowingHidden,
  setIsShowingHidden,
  setFilters,
}: iStackListFooterProps) {
  if (filteredCount === 0 && hiddenCount === 0) return null;
  return (
    <div className="flex shrink-0 flex-col gap-1 border-t border-line px-4 py-2 text-xs text-muted">
      {filteredCount > 0 ? (
        <div className="flex items-center justify-between gap-2">
          <span>{pluralize(filteredCount, 'stack')} filtered out</span>
          <Button variant="ghost" size="sm" onClick={() => setFilters(INCLUSIVE_STACK_FILTERS)}>
            Show all
          </Button>
        </div>
      ) : null}
      {hiddenCount > 0 ? (
        <div className="flex items-center justify-between gap-2">
          <span>{pluralize(hiddenCount, 'stack')} hidden</span>
          <Button variant="ghost" size="sm" onClick={() => setIsShowingHidden(!isShowingHidden)}>
            {isShowingHidden ? 'Hide them' : 'Show them'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
