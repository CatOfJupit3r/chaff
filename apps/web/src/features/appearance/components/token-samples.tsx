import { cn } from '@~/lib/utils';

import { TOKEN_SAMPLES } from '../appearance.constants';

export function TokenSamples() {
  return (
    <div className="grid grid-cols-2 gap-x-3.5 gap-y-1">
      {TOKEN_SAMPLES.map((token) => (
        <div key={token.name} className="flex min-w-0 items-center gap-2 font-mono text-[11.5px] text-muted">
          <i className={cn('size-3.5 flex-none rounded-[4px] border border-line-strong', token.swatchClassName)} />
          <span className="truncate">{token.name}</span>
        </div>
      ))}
    </div>
  );
}
