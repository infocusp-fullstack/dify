import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SyncButton from './sync-button'

// Mock the TooltipPlus module
vi.mock('@/app/components/base/tooltip', () => {
  return {
    __esModule: true,
    default: ({ popupContent, children }: { popupContent?: React.ReactNode, children?: React.ReactNode }) => {
      return (
        <div data-testid="mock-tooltip" data-popup={popupContent}>
          {children}
        </div>
      )
    },
  }
})

// Mock the classname util for deterministic behaviour
vi.mock('@/utils/classnames', () => {
  return {
    cn: (...args: Array<string | undefined | false>) => args.filter(Boolean).join(' '),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SyncButton component', () => {
  it('renders with default popupContent and triggers onClick', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<SyncButton onClick={handleClick} />)

    const tooltip = screen.getByTestId('mock-tooltip')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip.getAttribute('data-popup')).toBe('')

    const wrapper = tooltip.querySelector('div')
    expect(wrapper).toBeInTheDocument()

    if (wrapper) {
      await user.click(wrapper)
      expect(handleClick).toHaveBeenCalledTimes(1)
    }
  })

  it('applies custom className and custom popupContent', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <SyncButton
        onClick={handleClick}
        className="my-custom-class"
        popupContent="Sync now"
      />,
    )

    const tooltip = screen.getByTestId('mock-tooltip')
    expect(tooltip.getAttribute('data-popup')).toBe('Sync now')

    // Check className is applied and click works
    const wrapper = tooltip.querySelector('div')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper?.className).toContain('my-custom-class')
    expect(wrapper?.className).toContain('cursor-pointer')

    if (wrapper) {
      await user.click(wrapper)
      expect(handleClick).toHaveBeenCalledTimes(1)
    }
  })
})
