import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoDashboard = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-rose-100">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              An unexpected error occurred while rendering this page. You can safely return to the dashboard or refresh.
            </p>
            {this.state.error && (
              <pre className="text-left bg-slate-100 p-3 rounded-lg text-[11px] font-mono text-rose-700 overflow-x-auto mb-6 max-h-36">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                🔄 Refresh Page
              </button>
              <button
                onClick={this.handleGoDashboard}
                className="px-5 py-2 bg-[#29456D] hover:bg-[#172B4D] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                🏠 Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

