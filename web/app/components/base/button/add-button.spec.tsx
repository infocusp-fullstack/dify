import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddButton from './add-button'

// Mock the classname util for deterministic output
vi.mock('@/utils/classnames', () => {
  return {
    cn: (...args: Array<string | undefined | false>) => args.filter(Boolean).join(' '),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AddButton', () => {
  it('renders and calls onClick when clicked (default className)', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { container } = render(<AddButton onClick={handleClick} />)

    // The component renders a wrapper div as the first child
    const wrapper = container.firstElementChild as HTMLElement | null
    expect(wrapper).toBeTruthy()

    // The default classes (from the component) should be present
    expect(wrapper?.className).toContain('cursor-pointer')
    expect(wrapper?.className).toContain('select-none')
    expect(wrapper?.className).toContain('rounded-md')
    expect(wrapper?.className).toContain('p-1')
    expect(wrapper?.className).toContain('hover:bg-state-base-hover')

    // The icon (svg) should be rendered inside the wrapper
    const svg = wrapper?.querySelector('svg')
    expect(svg).toBeTruthy()

    // Clicking the wrapper triggers the onClick handler
    if (wrapper) {
      await user.click(wrapper)
      expect(handleClick).toHaveBeenCalledTimes(1)
    }
  })

  it('accepts a custom className and still triggers onClick', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { container } = render(<AddButton onClick={handleClick} className="my-custom-class" />)

    const wrapper = container.querySelector('.my-custom-class') as HTMLElement

    expect(wrapper).toBeTruthy()
    expect(wrapper.className).toContain('my-custom-class')
    // still includes default styling
    expect(wrapper.className).toContain('cursor-pointer')

    // click the element
    await user.click(wrapper)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('responds to multiple clicks', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { container } = render(<AddButton onClick={handleClick} />)
    const wrapper = container.firstElementChild as HTMLElement

    expect(wrapper).toBeTruthy()
    if (wrapper) {
      await user.dblClick(wrapper) // two clicks in quick succession
      expect(handleClick).toHaveBeenCalledTimes(2)
    }
  })
})
