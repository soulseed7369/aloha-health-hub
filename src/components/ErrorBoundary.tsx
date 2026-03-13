import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (import.meta.env.DEV) {
      console.error("Uncaught error:", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground max-w-sm">
            An unexpected error occurred. Please refresh the page to try again.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
