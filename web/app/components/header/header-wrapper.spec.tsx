import { act, render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { vi } from 'vitest'
import { useEventEmitterContextContext } from '@/context/event-emitter'
import HeaderWrapper from './header-wrapper'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

vi.mock('@/context/event-emitter', () => ({
  useEventEmitterContextContext: vi.fn(),
}))

describe('HeaderWrapper', () => {
  const mockEventEmitter = {
    useSubscription: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(usePathname).mockReturnValue('/test')
    vi.mocked(useEventEmitterContextContext).mockReturnValue({
      eventEmitter: mockEventEmitter,
    } as any) // eslint-disable-line ts/no-explicit-any
  })

  it('should render children correctly', () => {
    render(
      <HeaderWrapper>
        <div data-testid="child">Test Child</div>
      </HeaderWrapper>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  describe('Conditional Borders', () => {
    const borderedPaths = ['/apps', '/datasets/create', '/tools']

    it.each(borderedPaths)('should apply border-b class for %s', (path) => {
      vi.mocked(usePathname).mockReturnValue(path)
      const { container } = render(
        <HeaderWrapper>
          <div>Content</div>
        </HeaderWrapper>,
      )
      expect(container.firstChild).toHaveClass('border-b')
      expect(container.firstChild).toHaveClass('border-divider-regular')
    })

    it('should not apply border-b class for non-bordered paths', () => {
      vi.mocked(usePathname).mockReturnValue('/other')
      const { container } = render(
        <HeaderWrapper>
          <div>Content</div>
        </HeaderWrapper>,
      )
      expect(container.firstChild).not.toHaveClass('border-b')
    })
  })

  describe('Visibility Logic (Workflow/Pipeline Canvas)', () => {
    it('should be hidden when hideHeader is true and in workflow canvas', () => {
      vi.mocked(usePathname).mockReturnValue('/some/path/workflow')
      localStorage.setItem('workflow-canvas-maximize', 'true')

      const { container } = render(
        <HeaderWrapper>
          <div>Content</div>
        </HeaderWrapper>,
      )
      expect(container.firstChild).toHaveClass('hidden')
    })

    it('should be hidden when hideHeader is true and in pipeline canvas', () => {
      vi.mocked(usePathname).mockReturnValue('/some/path/pipeline')
      localStorage.setItem('workflow-canvas-maximize', 'true')

      const { container } = render(
        <HeaderWrapper>
          <div>Content</div>
        </HeaderWrapper>,
      )
      expect(container.firstChild).toHaveClass('hidden')
    })

    it('should not be hidden when hideHeader is true but NOT in workflow/pipeline canvas', () => {
      vi.mocked(usePathname).mockReturnValue('/apps')
      localStorage.setItem('workflow-canvas-maximize', 'true')

      const { container } = render(
        <HeaderWrapper>
          <div>Content</div>
        </HeaderWrapper>,
      )
      expect(container.firstChild).not.toHaveClass('hidden')
    })

    it('should update hideHeader state via event subscription', () => {
      vi.mocked(usePathname).mockReturnValue('/some/path/workflow')
      let subscriptionCallback: (v: unknown) => void = () => {}
      mockEventEmitter.useSubscription.mockImplementation((cb) => {
        subscriptionCallback = cb
      })

      const { container } = render(
        <HeaderWrapper>
          <div>Content</div>
        </HeaderWrapper>,
      )

      expect(container.firstChild).not.toHaveClass('hidden')

      // Simulate event to maximize
      act(() => {
        subscriptionCallback({
          type: 'workflow-canvas-maximize',
          payload: true,
        })
      })

      expect(container.firstChild).toHaveClass('hidden')

      // Simulate event to minimize
      act(() => {
        subscriptionCallback({
          type: 'workflow-canvas-maximize',
          payload: false,
        })
      })

      expect(container.firstChild).not.toHaveClass('hidden')
    })

    it('should ignore other event types in subscription', () => {
      vi.mocked(usePathname).mockReturnValue('/some/path/workflow')
      let subscriptionCallback: (v: unknown) => void = () => {}
      mockEventEmitter.useSubscription.mockImplementation((cb) => {
        subscriptionCallback = cb
      })

      const { container } = render(
        <HeaderWrapper>
          <div>Content</div>
        </HeaderWrapper>,
      )

      // Simulate unrelated event
      subscriptionCallback({ type: 'other-event', payload: true })

      expect(container.firstChild).not.toHaveClass('hidden')
    })

    it('should handle missing eventEmitter gracefully', () => {
      vi.mocked(useEventEmitterContextContext).mockReturnValue({
        eventEmitter: undefined,
      } as any) // eslint-disable-line ts/no-explicit-any

      const { container } = render(
        <HeaderWrapper>
          <div>Content</div>
        </HeaderWrapper>,
      )
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})
