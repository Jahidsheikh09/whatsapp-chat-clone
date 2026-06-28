import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    console.error('ErrorBoundary caught error:', error)
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0d1418',
          color: '#fff',
          fontFamily: 'Segoe UI, sans-serif'
        }}>
          <div style={{ padding: '20px', textAlign: 'center', background: '#262d31', borderRadius: '8px', maxWidth: '500px' }}>
            <h1 style={{ margin: '0 0 10px 0', color: '#ff6b6b' }}>⚠️ Application Error</h1>
            <p style={{ margin: '0 0 15px 0', color: '#aaa' }}>The app encountered an unexpected error:</p>
            <code style={{
              display: 'block',
              background: '#0d1418',
              padding: '10px',
              borderRadius: '4px',
              color: '#ffb6b6',
              fontSize: '12px',
              wordBreak: 'break-word',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {this.state.error?.toString()}
            </code>
            <p style={{ margin: '15px 0 0 0', color: '#aaa', fontSize: '12px' }}>
              Check the browser console (F12) for more details, then refresh the page.
            </p>
            <button onClick={() => window.location.reload()} style={{
              marginTop: '15px',
              padding: '10px 20px',
              background: '#25a55d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
