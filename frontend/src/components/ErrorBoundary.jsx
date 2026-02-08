import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: '#f5f5f5',
          }}
        >
          <p style={{ color: '#333', marginBottom: 16, fontSize: 18 }}>
            Something went wrong. Please try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              backgroundColor: '#2962ff',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
