import type { ReactNode } from 'react';

interface iFieldProps {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}

/** A labelled settings row: muted label, the control, and an optional faint hint below. */
export function Field({ label, hint, children }: iFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] text-muted">{label}</span>
      {children}
      {hint ? <small className="text-[12px] text-faint">{hint}</small> : null}
    </div>
  );
}
