import { Link } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';

import type { IconComponent } from '@~/components/icons/create-icon';
import { InboxIcon } from '@~/components/icons/icons';
import { Logo } from '@~/components/ui/logo';

interface iRailLinkProps {
  to: LinkProps['to'];
  icon: IconComponent;
  label: string;
}

function RailLink({ to, icon: Icon, label }: iRailLinkProps) {
  return (
    <Link
      to={to}
      className="relative flex w-[52px] flex-col items-center gap-1 rounded-md pt-[7px] pb-1.5 text-[10.5px] tracking-[0.01em] text-faint hover:bg-hover hover:text-fg aria-[current=page]:bg-raised aria-[current=page]:text-fg"
    >
      <Icon />
      {label}
    </Link>
  );
}

export function AppRail() {
  return (
    <nav aria-label="Screens" className="flex flex-col items-center gap-1 border-r border-line bg-canvas py-3.5">
      <Logo className="mb-3.5 text-fg" />
      <RailLink to="/" icon={InboxIcon} label="Reviews" />
    </nav>
  );
}
