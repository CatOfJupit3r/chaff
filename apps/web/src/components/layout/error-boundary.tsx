import { Component } from 'react';
import type { ComponentType, ReactNode } from 'react';

export interface iErrorFallbackProps {
  error: unknown;
  /** Draws the children again. */
  reset: () => void;
}

interface iErrorBoundaryProps {
  children: ReactNode;
  /** Shown in place of the children once they throw while rendering. */
  fallback: ComponentType<iErrorFallbackProps>;
}

interface iErrorBoundaryState {
  hasError: boolean;
  error?: unknown;
}

/** Keeps a render error in its children from taking down the rest of the screen. */
export class ErrorBoundary extends Component<iErrorBoundaryProps, iErrorBoundaryState> {
  public constructor(props: iErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: unknown): iErrorBoundaryState {
    return { hasError: true, error };
  }

  private readonly reset = () => this.setState({ hasError: false, error: undefined });

  public render() {
    const { hasError, error } = this.state;
    const { children, fallback: Fallback } = this.props;
    // Wrapped in a fragment so the return type is not read as a promise and `render` made async by lint fixes.
    return hasError ? <Fallback error={error} reset={this.reset} /> : <>{children}</>;
  }
}
