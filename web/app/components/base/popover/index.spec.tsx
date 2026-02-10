import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomPopover from '.'

vi.mock('@headlessui/react', async () => {
  const actual = await vi.importActual<typeof import('@headlessui/react')>('@headlessui/react')
  return {
    ...actual,
    Transition: ({ children }: { children: React.ReactNode }) => children,
  }
})

const CloseButtonContent = ({ onClick }: { onClick?: () => void }) => (
  <button data-testid="content" onClick={onClick}>Close Me</button>
)

describe('CustomPopover', () => {
  const defaultProps = {
    btnElement: <button data-testid="trigger">Trigger</button>,
    htmlContent: <div data-testid="content">Popover Content</div>,
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders trigger element', () => {
    render(<CustomPopover {...defaultProps} />)
    expect(screen.getByTestId('trigger')).toBeInTheDocument()
  })

  it('toggles when clicking the button', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    render(<CustomPopover {...defaultProps} trigger="click" />)
    const trigger = screen.getByTestId('trigger')

    await user.click(trigger)
    expect(screen.getByTestId('content')).toBeInTheDocument()

    await user.click(trigger)

    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })
  })

  it('opens on hover when trigger is "hover" (default)', async () => {
    render(<CustomPopover {...defaultProps} />)

    expect(screen.queryByTestId('content')).not.toBeInTheDocument()

    const triggerContainer = screen.getByTestId('trigger').closest('div')

    await act(async () => {
      fireEvent.mouseEnter(triggerContainer!)
    })

    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('closes after delay on mouse leave when trigger is "hover"', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    render(<CustomPopover {...defaultProps} />)

    const trigger = screen.getByTestId('trigger')

    await user.hover(trigger)
    expect(screen.getByTestId('content')).toBeInTheDocument()

    await user.unhover(trigger)

    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('stays open when hovering over the popover content', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    render(<CustomPopover {...defaultProps} />)

    const trigger = screen.getByTestId('trigger')
    await user.hover(trigger)
    expect(screen.getByTestId('content')).toBeInTheDocument()

    // Leave trigger but enter content
    await user.unhover(trigger)
    const content = screen.getByTestId('content')
    await user.hover(content)

    // Wait for the timeout duration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    // Should still be open because we are hovering the content
    expect(screen.getByTestId('content')).toBeInTheDocument()

    // Now leave content
    await user.unhover(content)

    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('cancels close timeout if re-entering during hover delay', async () => {
    render(<CustomPopover {...defaultProps} />)

    const triggerContainer = screen.getByTestId('trigger').closest('div')

    await act(async () => {
      fireEvent.mouseEnter(triggerContainer!)
    })

    await act(async () => {
      fireEvent.mouseLeave(triggerContainer!)
    })

    await act(async () => {
      vi.advanceTimersByTime(50) // Halfway through timeout
      fireEvent.mouseEnter(triggerContainer!)
    })

    await act(async () => {
      vi.advanceTimersByTime(1000) // Much longer than the original timeout
    })

    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('applies position classes correctly', async () => {
    const { rerender } = render(
      <CustomPopover {...defaultProps} position="bottom" trigger="click" />,
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'))
    })

    let panel = document.querySelector('.absolute')
    expect(panel).toHaveClass('left-1/2')
    expect(panel).toHaveClass('-translate-x-1/2')

    await act(async () => {
      rerender(<CustomPopover {...defaultProps} position="bl" trigger="click" />)
    })
    panel = document.querySelector('.absolute')
    expect(panel).toHaveClass('left-0')

    await act(async () => {
      rerender(<CustomPopover {...defaultProps} position="br" trigger="click" />)
    })
    panel = document.querySelector('.absolute')
    expect(panel).toHaveClass('right-0')
  })

  it('does not open when disabled', async () => {
    render(<CustomPopover {...defaultProps} disabled={true} trigger="click" />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'))
    })

    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })

  it('passes close function to htmlContent and handles manualClose', async () => {
    vi.useRealTimers()

    render(
      <CustomPopover
        {...defaultProps}
        htmlContent={<CloseButtonContent />}
        trigger="click"
        manualClose={true}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'))
    })

    expect(screen.getByTestId('content')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByTestId('content'))
    })

    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })
  })

  it('applies custom class names', async () => {
    render(
      <CustomPopover
        {...defaultProps}
        trigger="click"
        className="wrapper-class"
        popupClassName="popup-inner-class"
        btnClassName="btn-class"
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'))
    })

    expect(document.querySelector('.wrapper-class')).toBeInTheDocument()
    expect(document.querySelector('.popup-inner-class')).toBeInTheDocument()

    const button = screen.getByTestId('trigger').parentElement
    expect(button).toHaveClass('btn-class')
  })

  it('handles btnClassName as a function', () => {
    render(
      <CustomPopover
        {...defaultProps}
        btnClassName={open => open ? 'btn-open' : 'btn-closed'}
      />,
    )

    const button = screen.getByTestId('trigger').parentElement
    expect(button).toHaveClass('btn-closed')
  })

  it('renders string as htmlContent', async () => {
    render(<CustomPopover {...defaultProps} htmlContent="String Content" trigger="click" />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'))
    })
    expect(screen.getByText('String Content')).toBeInTheDocument()
  })

  it('does not trigger click when leaving while already closed', async () => {
    vi.useFakeTimers()
    render(<CustomPopover {...defaultProps} />)
    const triggerContainer = screen.getByTestId('trigger').closest('div')

    // Trigger mouseLeave while closed
    await act(async () => {
      fireEvent.mouseLeave(triggerContainer!)
    })

    await act(async () => {
      vi.runAllTimers()
    })

    // Still closed
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })
})
