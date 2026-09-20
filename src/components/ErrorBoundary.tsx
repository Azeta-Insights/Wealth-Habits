import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Wealth Habits caught an unhandled UI error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 sm:p-10 my-4 max-w-xl mx-auto rounded-3xl bg-white border border-[#E8E2D9] shadow-sm text-center space-y-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3EB] text-[#C53B27] flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-editorial text-lg font-bold text-[#233227]">
              {this.props.fallbackTitle || 'Unable to display this view'}
            </h3>
            <p className="text-xs text-[#636C62]">
              A temporary display error occurred. Your financial data is securely saved.
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] font-mono text-[#8A9588] bg-[#FAF7F2] p-2 rounded-xl border border-[#EFE9DE] mt-2 inline-block max-w-full truncate">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-[#3D5A45] text-white text-xs font-semibold hover:bg-[#344D3A] flex items-center gap-1.5 shadow-sm transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry View</span>
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-4 py-2 rounded-xl border border-[#D5CBBF] text-xs font-semibold text-[#233227] hover:bg-[#FAF7F2] flex items-center gap-1.5 transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
