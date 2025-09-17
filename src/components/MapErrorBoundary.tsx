import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: any;
}

export class MapErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Map render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-96 w-full rounded-lg grid place-items-center text-sm text-destructive">
          Failed to load map. Please refresh or try again.
        </div>
      );
    }
    return this.props.children;
  }
}
