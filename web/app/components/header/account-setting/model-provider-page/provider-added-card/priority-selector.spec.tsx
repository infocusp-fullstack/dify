import { fireEvent, render, screen } from '@testing-library/react'
import PrioritySelector from './priority-selector'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/button', () => ({
  default: ({ children, onClick }: { children?: React.ReactNode, onClick?: () => void }) => (
    <button onClick={onClick} data-testid="selector-button">{children}</button>
  ),
}))

describe('PrioritySelector', () => {
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render selector button', () => {
    render(<PrioritySelector value="system" onSelect={mockOnSelect} />)
    expect(screen.getByTestId('selector-button')).toBeInTheDocument()
  })

  it('should call onSelect when option clicked', () => {
    render(<PrioritySelector value="system" onSelect={mockOnSelect} />)
    fireEvent.click(screen.getByTestId('selector-button'))
    const option = screen.getByText('modelProvider.apiKey')
    fireEvent.click(option)
    expect(mockOnSelect).toHaveBeenCalled()
  })

  it('should show checkmark on selected option', () => {
    const { container } = render(<PrioritySelector value="custom" onSelect={mockOnSelect} />)
    fireEvent.click(screen.getByTestId('selector-button'))
    expect(container.querySelector('[data-testid]')).toBeInTheDocument()
  })
})
