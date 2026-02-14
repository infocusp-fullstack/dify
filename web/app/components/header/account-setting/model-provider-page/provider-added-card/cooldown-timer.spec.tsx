import { render, screen } from '@testing-library/react'
import CooldownTimer from './cooldown-timer'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options: { seconds: number }) => `Rate limit: ${options.seconds}s`,
  }),
}))

vi.mock('@/app/components/base/simple-pie-chart', () => ({
  default: ({ percentage }: { percentage: number }) => (
    <div data-testid="pie-chart">
      {percentage}
      %
    </div>
  ),
}))

vi.mock('@/app/components/base/tooltip', () => ({
  default: ({ children, popupContent }: { children: React.ReactNode, popupContent: string }) => (
    <div data-testid="tooltip" title={popupContent}>{children}</div>
  ),
}))

describe('CooldownTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render timer with tooltip', () => {
    render(<CooldownTimer secondsRemaining={10} />)
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('should show tooltip with rate limit message', () => {
    const { container } = render(<CooldownTimer secondsRemaining={30} />)
    const tooltip = container.querySelector('[data-testid="tooltip"]')
    if (tooltip) {
      expect(tooltip.getAttribute('title')).toContain('Rate limit')
    }
  })

  it('should not render when secondsRemaining is zero', () => {
    const { container } = render(<CooldownTimer secondsRemaining={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('should not render when secondsRemaining is undefined', () => {
    const { container } = render(<CooldownTimer />)
    expect(container.firstChild).toBeNull()
  })
})
