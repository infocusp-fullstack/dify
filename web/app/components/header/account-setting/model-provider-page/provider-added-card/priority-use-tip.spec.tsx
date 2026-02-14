import { render, screen } from '@testing-library/react'
import PriorityUseTip from './priority-use-tip'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/tooltip', () => ({
  default: ({ children, popupContent }: { children: React.ReactNode, popupContent: string }) => (
    <div data-testid="tooltip" title={popupContent}>{children}</div>
  ),
}))

vi.mock('@/app/components/base/icons/src/vender/line/arrows', () => ({
  ChevronDownDouble: () => <div data-testid="chevron-icon" />,
}))

describe('PriorityUseTip', () => {
  it('should render tooltip wrapper', () => {
    render(<PriorityUseTip />)
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('should display chevron icon', () => {
    render(<PriorityUseTip />)
    expect(screen.getByTestId('chevron-icon')).toBeInTheDocument()
  })

  it('should have correct positioning styles', () => {
    const { container } = render(<PriorityUseTip />)
    const div = container.querySelector('div[class*="absolute"]')
    expect(div).toBeInTheDocument()
  })
})
