import { render, screen } from '@testing-library/react'
import * as React from 'react'
import ListEmpty from './index'

// Mock icons and line components
vi.mock('../icons/src/vender/solid/development', () => ({
  Variable02: () => <div data-testid="default-icon" />,
}))

vi.mock('./horizontal-line', () => ({
  default: ({ className }: { className: string }) => <div data-testid="horizontal-line" className={className} />,
}))

vi.mock('./vertical-line', () => ({
  default: ({ className }: { className: string }) => <div data-testid="vertical-line" className={className} />,
}))

describe('ListEmpty', () => {
  it('renders default icon when no icon is provided', () => {
    render(<ListEmpty />)
    expect(screen.getByTestId('default-icon')).toBeInTheDocument()
  })

  it('renders custom icon when provided', () => {
    render(<ListEmpty icon={<div data-testid="custom-icon" />} />)
    expect(screen.queryByTestId('default-icon')).not.toBeInTheDocument()
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('renders title and description correctly', () => {
    const testTitle = 'Empty List'
    const testDescription = <span data-testid="desc">No items found</span>

    render(<ListEmpty title={testTitle} description={testDescription} />)

    expect(screen.getByText(testTitle)).toBeInTheDocument()
    expect(screen.getByTestId('desc')).toBeInTheDocument()
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('renders design lines', () => {
    render(<ListEmpty />)
    // 2 horizontal lines, 2 vertical lines
    expect(screen.getAllByTestId('horizontal-line')).toHaveLength(2)
    expect(screen.getAllByTestId('vertical-line')).toHaveLength(2)
  })

  it('applies correct class names to the container', () => {
    const { container } = render(<ListEmpty />)
    const mainDiv = container.firstChild as HTMLElement
    expect(mainDiv).toHaveClass('flex', 'w-[320px]', 'flex-col', 'items-start', 'gap-2', 'rounded-[10px]', 'bg-workflow-process-bg', 'p-4')
  })
})
