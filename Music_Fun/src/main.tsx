import { StrictMode } from 'react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application rendering error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h1>Music player could not load</h1>
          <p>Reload the page and try again. Check the browser console for the exact error.</p>
        </main>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
