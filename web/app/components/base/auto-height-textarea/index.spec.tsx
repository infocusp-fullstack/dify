import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AutoHeightTextarea from './index'

vi.mock('@/utils', () => ({
  sleep: vi.fn(() => Promise.resolve()),
}))

describe('AutoHeightTextarea', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with basic props and applies custom classes', () => {
    render(
      <AutoHeightTextarea
        {...defaultProps}
        placeholder="Enter text"
        className="test-class"
        wrapperClassName="wrapper-class"
      />,
    )

    const textarea = screen.getByPlaceholderText('Enter text')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveClass('test-class')
    expect(textarea).toHaveClass('absolute', 'inset-0', 'resize-none', 'overflow-auto')
    expect(textarea.parentElement).toHaveClass('wrapper-class')
    expect(textarea.parentElement).toHaveClass('relative')
  })

  it('mirrors value to shadow div with proper formatting and handles edge cases', async () => {
    const { container, rerender } = render(
      <AutoHeightTextarea {...defaultProps} value={'Hello\nWorld'} />,
    )

    const shadowDiv = container.querySelector('.invisible')
    expect(shadowDiv).toBeInTheDocument()
    expect(shadowDiv).toHaveClass('invisible', 'overflow-y-auto', 'whitespace-pre-wrap', 'break-all')
    expect(shadowDiv?.textContent).toBe('Hello\nWorld')

    // Trailing newline gets extra space
    rerender(<AutoHeightTextarea {...defaultProps} value={'Text\n'} />)
    expect(shadowDiv?.textContent).toBe('Text\n ')

    // Empty value shows placeholder
    rerender(<AutoHeightTextarea {...defaultProps} value="" placeholder="Type here" />)
    expect(shadowDiv?.textContent).toBe('Type here')

    // Value without placeholder
    rerender(<AutoHeightTextarea {...defaultProps} value="Content" />)
    expect(shadowDiv?.textContent).toBe('Content')

    // Multiple trailing newlines
    rerender(<AutoHeightTextarea {...defaultProps} value={'Text\n\n'} />)
    expect(shadowDiv?.textContent).toBe('Text\n\n ')
  })

  it('applies correct padding based on text length threshold', () => {
    const { rerender } = render(<AutoHeightTextarea {...defaultProps} value="short" />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    const shadowDiv = textarea.parentElement?.querySelector('.invisible') as HTMLElement

    // Short text: 130px padding
    expect(textarea.style.paddingRight).toBe('130px')
    expect(shadowDiv.style.paddingRight).toBe('130px')

    // Exactly at threshold (10,000 trimmed chars)
    const exactThreshold = 'a'.repeat(10000)
    rerender(<AutoHeightTextarea {...defaultProps} value={exactThreshold} />)
    expect(textarea.style.paddingRight).toBe('130px')
    expect(shadowDiv.style.paddingRight).toBe('130px')

    // Just over threshold (10,001 trimmed chars): 140px padding
    const overThreshold = 'a'.repeat(10001)
    rerender(<AutoHeightTextarea {...defaultProps} value={overThreshold} />)
    expect(textarea.style.paddingRight).toBe('140px')
    expect(shadowDiv.style.paddingRight).toBe('140px')

    // Text with whitespace that trims to under threshold
    const textWithWhitespace = `${'a'.repeat(9999)}   \n  `
    rerender(<AutoHeightTextarea {...defaultProps} value={textWithWhitespace} />)
    expect(textarea.style.paddingRight).toBe('130px')

    // Text with whitespace that trims to over threshold
    const longTextWithWhitespace = `${'a'.repeat(10001)}   \n  `
    rerender(<AutoHeightTextarea {...defaultProps} value={longTextWithWhitespace} />)
    expect(textarea.style.paddingRight).toBe('140px')
  })

  it('applies custom height constraints to shadow div', () => {
    const { container, rerender } = render(
      <AutoHeightTextarea
        {...defaultProps}
        minHeight={50}
        maxHeight={200}
      />,
    )

    const shadowDiv = container.querySelector('.invisible') as HTMLElement
    expect(shadowDiv.style.minHeight).toBe('50px')
    expect(shadowDiv.style.maxHeight).toBe('200px')

    // Default values when not provided
    rerender(<AutoHeightTextarea {...defaultProps} />)
    expect(shadowDiv.style.minHeight).toBe('36px')
    expect(shadowDiv.style.maxHeight).toBe('96px')
  })

  it('forwards ref as prop and allows external access to textarea', () => {
    const ref = { current: null } as unknown as React.RefObject<HTMLTextAreaElement>

    render(<AutoHeightTextarea {...defaultProps} ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
    expect(ref.current?.tagName).toBe('TEXTAREA')
    expect(ref.current?.value).toBe('')
  })

  it('handles autoFocus with retry logic when ref is initially unavailable', async () => {
    const mockSleep = vi.mocked(await import('@/utils')).sleep
    mockSleep.mockClear()

    // Simulate delayed ref availability
    let callCount = 0
    const delayedRef = {
      get current() {
        callCount++
        if (callCount < 3)
          return null
        return document.createElement('textarea')
      },
      set current(_v: unknown) { /* noop */ },
    } as unknown as React.RefObject<HTMLTextAreaElement>

    render(<AutoHeightTextarea {...defaultProps} autoFocus ref={delayedRef} />)

    await act(async () => {
      await Promise.resolve()
    })

    // Verify retry attempts were made
    expect(callCount).toBeGreaterThanOrEqual(3)
    expect(mockSleep).toHaveBeenCalled()
  })

  it('focuses textarea and sets cursor position when controlFocus changes', async () => {
    const testValue = 'Test content'
    const { rerender } = render(
      <AutoHeightTextarea
        {...defaultProps}
        value={testValue}
        controlFocus={1}
      />,
    )

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    await act(async () => {
      rerender(
        <AutoHeightTextarea
          {...defaultProps}
          value={testValue}
          controlFocus={2}
        />,
      )
    })

    expect(textarea).toHaveFocus()
    expect(textarea.selectionStart).toBe(testValue.length)
    expect(textarea.selectionEnd).toBe(testValue.length)
  })

  it('handles keyboard events and callbacks', async () => {
    const onKeyDown = vi.fn()
    const onKeyUp = vi.fn()
    const user = userEvent.setup()

    render(
      <AutoHeightTextarea
        {...defaultProps}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      />,
    )

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    await user.type(textarea, 'a{Enter}b')

    expect(onKeyDown).toHaveBeenCalled()
    expect(onKeyUp).toHaveBeenCalled()

    const keyDownCalls = onKeyDown.mock.calls
    const hasEnterKey = keyDownCalls.some(call => call[0].key === 'Enter')
    expect(hasEnterKey).toBe(true)
  })

  it('updates value through controlled component pattern', async () => {
    const user = userEvent.setup()

    const ControlledWrapper = () => {
      const [val, setVal] = useState('')
      return (
        <AutoHeightTextarea
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="Type here"
        />
      )
    }

    render(<ControlledWrapper />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    expect(textarea.value).toBe('')

    await user.type(textarea, 'Hello World')
    expect(textarea.value).toBe('Hello World')

    await user.clear(textarea)
    expect(textarea.value).toBe('')

    await user.type(textarea, 'Line 1{Enter}Line 2')
    expect(textarea.value).toBe('Line 1\nLine 2')
  })

  it('maintains synchronization between textarea and shadow div for auto-sizing', () => {
    const { container, rerender } = render(
      <AutoHeightTextarea {...defaultProps} value="" placeholder="Empty" />,
    )

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    const shadowDiv = container.querySelector('.invisible') as HTMLElement

    // Both should have same base classes for sizing calculation
    const sharedStyles = ['whitespace-pre-wrap', 'break-all']
    const hasSameBreakingBehavior = sharedStyles.every(cls =>
      shadowDiv.classList.contains(cls),
    )
    expect(hasSameBreakingBehavior).toBe(true)

    // Verify padding stays in sync
    rerender(<AutoHeightTextarea {...defaultProps} value="short" />)
    expect(textarea.style.paddingRight).toBe(shadowDiv.style.paddingRight)

    rerender(<AutoHeightTextarea {...defaultProps} value={'a'.repeat(10001)} />)
    expect(textarea.style.paddingRight).toBe(shadowDiv.style.paddingRight)
  })
})
