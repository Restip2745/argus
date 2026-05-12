import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  label?: string
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.label ?? 'Unknown'} crashed:`, error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false, message: '' })

  override render() {
    if (!this.state.hasError) return this.props.children

    const label = this.props.label ?? 'Component'
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '4px 8px',
        background: 'rgba(255,77,77,0.06)',
        border: '1px solid rgba(255,77,77,0.25)',
        borderRadius: '3px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '8px',
        color: '#ff6060',
        letterSpacing: '0.06em',
        maxWidth: '260px',
        pointerEvents: 'all',
      }}>
        <span>⚠ {label} error</span>
        <button
          onClick={this.reset}
          style={{
            background: 'rgba(255,77,77,0.1)',
            border: '1px solid rgba(255,77,77,0.3)',
            borderRadius: '2px',
            color: '#ff9090',
            fontSize: '7px',
            padding: '1px 5px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.06em',
          }}
        >
          RETRY
        </button>
      </div>
    )
  }
}
