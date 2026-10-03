import { Link } from '@tanstack/react-router';

import { buttonVariants } from '@~/components/ui/button-variants';

export function RouteNotFound() {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="flex flex-col items-start gap-3">
        <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">Nothing here</h1>
        <Link to="/" className={buttonVariants()}>
          Back to Reviews
        </Link>
      </div>
    </div>
  );
}
