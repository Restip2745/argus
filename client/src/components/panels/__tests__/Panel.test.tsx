import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Panel } from '../Panel'

describe('Panel', () => {
  it('renders title and children', () => {
    render(
      <Panel title="TEST TITLE" onClose={() => {}}>
        <div>body content</div>
      </Panel>,
    )
    expect(screen.getByText('TEST TITLE')).toBeInTheDocument()
    expect(screen.getByText('body content')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<Panel title="X" onClose={onClose}><span /></Panel>)
    fireEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders headerLeft and headerControls', () => {
    render(
      <Panel
        title="TITLE"
        headerLeft={<span>LEFT</span>}
        headerControls={<button>CTRL</button>}
        onClose={() => {}}
      >
        <span />
      </Panel>,
    )
    expect(screen.getByText('LEFT')).toBeInTheDocument()
    expect(screen.getByText('CTRL')).toBeInTheDocument()
  })

  it('renders without crashing when accentColor is provided', () => {
    const { container } = render(
      <Panel title="T" accentColor="#ff0000" onClose={() => {}}>
        <span>content</span>
      </Panel>,
    )
    // Should render the outer container
    expect(container.firstChild).not.toBeNull()
    // Accent color propagates into inline styles of child decoration elements
    const allStyles = Array.from(container.querySelectorAll('[style]'))
      .map((el) => (el as HTMLElement).style.background + (el as HTMLElement).style.borderColor)
      .join(' ')
    // jsdom normalises #ff0000 → rgb(255, 0, 0) in computed styles
    expect(allStyles).toMatch(/255,\s*0,\s*0/)
  })

  it('applies width style when provided', () => {
    const { container } = render(
      <Panel title="T" onClose={() => {}} width={400}>
        <span />
      </Panel>,
    )
    const outer = container.firstChild as HTMLElement
    expect(outer.style.width).toBe('400px')
  })

  it('calls onHeaderMouseDown when header is clicked', () => {
    const onHeaderMouseDown = vi.fn()
    render(
      <Panel title="T" onClose={() => {}} onHeaderMouseDown={onHeaderMouseDown}>
        <span />
      </Panel>,
    )
    // The drag area wraps the title — find via role or by querying the header div
    fireEvent.mouseDown(screen.getByText('T').closest('div')!)
    expect(onHeaderMouseDown).toHaveBeenCalled()
  })

  it('sets userSelect none when dragging', () => {
    const { container } = render(
      <Panel title="T" onClose={() => {}} dragging>
        <span />
      </Panel>,
    )
    const outer = container.firstChild as HTMLElement
    expect(outer.style.userSelect).toBe('none')
  })

  it('forwards HTML div props (onMouseDown, className) to outer div', () => {
    const onMouseDown = vi.fn()
    const { container } = render(
      <Panel title="T" onClose={() => {}} onMouseDown={onMouseDown} className="my-panel">
        <span />
      </Panel>,
    )
    const outer = container.firstChild as HTMLElement
    expect(outer.classList.contains('my-panel')).toBe(true)
    fireEvent.mouseDown(outer)
    expect(onMouseDown).toHaveBeenCalled()
  })

  it('merges custom style with base styles', () => {
    const { container } = render(
      <Panel title="T" onClose={() => {}} style={{ position: 'fixed', top: 42 }}>
        <span />
      </Panel>,
    )
    const outer = container.firstChild as HTMLElement
    expect(outer.style.position).toBe('fixed')
    expect(outer.style.top).toBe('42px')
    // Base styles still applied
    expect(outer.style.borderRadius).toBe('4px')
  })
})
