import { render, screen } from '@testing-library/react'
import Card from './card'

describe('PromptLogModal Card', () => {
  it('renders single log entry correctly', () => {
    const log = [{ role: 'user', text: 'Single entry text' }]
    render(<Card log={log} />)

    expect(screen.getByText('Single entry text')).toBeInTheDocument()
    // Should NOT show role when only one entry
    expect(screen.queryByText('USER')).not.toBeInTheDocument()
  })

  it('renders multiple log entries correctly', () => {
    const log = [
      { role: 'user', text: 'Message 1' },
      { role: 'assistant', text: 'Message 2' },
    ]
    render(<Card log={log} />)

    // Check roles (uppercased)
    expect(screen.getByText('USER')).toBeInTheDocument()
    expect(screen.getByText('ASSISTANT')).toBeInTheDocument()

    // Check texts
    expect(screen.getByText('Message 1')).toBeInTheDocument()
    expect(screen.getByText('Message 2')).toBeInTheDocument()
  })

  it('applies correct classes for hover and transitions', () => {
    const log = [
      { role: 'user', text: 'Message 1' },
      { role: 'assistant', text: 'Message 2' },
    ]
    const { container } = render(<Card log={log} />)

    // Check for grouping class used for hover effects
    const rows = container.querySelectorAll('.group\\/card')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveClass('hover:bg-state-base-hover')
  })
})
