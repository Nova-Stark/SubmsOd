import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Surface error details for debugging without console.log spam
    void error
    void errorInfo
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Something went wrong</h1>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-6 leading-relaxed">
            The application encountered an unexpected runtime error. Your session data is preserved.
          </p>
          {this.state.error?.message && (
            <div className="mb-6 p-3 bg-white border border-slate-200 rounded-md text-[11px] font-mono text-slate-700 max-w-lg text-left overflow-x-auto shadow-xs">
              {this.state.error.message}
            </div>
          )}
          <Button variant="primary" onClick={this.handleReset}>
            <RotateCcw className="w-4 h-4" /> Reload Application
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
