import type { UseEmblaCarouselType } from 'embla-carousel-react'
import type { Mock } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import useEmblaCarousel from 'embla-carousel-react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Carousel } from './index'

// Mock embla-carousel-react
vi.mock('embla-carousel-react', () => ({
  default: vi.fn(),
}))

// Define types that match what we use in tests
type CarouselApi = UseEmblaCarouselType[1]
type EmblaEventType = 'init' | 'reInit' | 'select' | 'scroll' | 'resize' | 'destroy'

// A more specific mock type for our internal testing needs
type MockEmblaApi = {
  on: (ev: EmblaEventType, cb: (api: CarouselApi) => void) => void
  off: (ev: EmblaEventType, cb?: (api: CarouselApi) => void) => void
  selectedScrollSnap: () => number
  canScrollPrev: () => boolean
  canScrollNext: () => boolean
  slideNodes: () => HTMLElement[]
  scrollPrev: () => void
  scrollNext: () => void
  scrollTo: (index: number) => void
  // Helpers for testing
  emit: (ev: EmblaEventType, ...args: unknown[]) => void
  _setSelected: (index: number) => void
  _setCanScrollPrev: (can: boolean) => void
  _setCanScrollNext: (can: boolean) => void
}

const createMockApi = (
  initialState = {
    selectedIndex: 0,
    canScrollPrev: false,
    canScrollNext: true,
    slideCount: 3,
  },
): MockEmblaApi => {
  let selectedIndex = initialState.selectedIndex
  let canScrollPrev = initialState.canScrollPrev
  let canScrollNext = initialState.canScrollNext
  const slideCount = initialState.slideCount

  const listeners: Record<string, ((api: CarouselApi) => void)[]> = {}

  const api: MockEmblaApi = {
    on: vi.fn((ev, cb) => {
      if (!listeners[ev])
        listeners[ev] = []
      listeners[ev].push(cb)
    }),
    off: vi.fn((ev, cb) => {
      if (!listeners[ev])
        return
      if (cb) {
        listeners[ev] = listeners[ev].filter(fn => fn !== cb)
      }
      else {
        delete listeners[ev]
      }
    }),
    selectedScrollSnap: vi.fn(() => selectedIndex),
    canScrollPrev: vi.fn(() => canScrollPrev),
    canScrollNext: vi.fn(() => canScrollNext),
    slideNodes: vi.fn(() => Array.from({ length: slideCount }, () => document.createElement('div'))),
    scrollPrev: vi.fn(() => {
      if (selectedIndex > 0)
        selectedIndex--
      api.emit('select')
    }),
    scrollNext: vi.fn(() => {
      // Simple logic for testing
      if (selectedIndex < slideCount - 1)
        selectedIndex++
      api.emit('select')
    }),
    scrollTo: vi.fn((index) => {
      selectedIndex = index
      api.emit('select')
    }),
    emit: (ev, ...args) => {
      listeners[ev]?.forEach(cb =>
        cb(args.length > 0 ? (args[0] as CarouselApi) : (api as unknown as CarouselApi)),
      )
    },
    _setSelected: (index) => {
      selectedIndex = index
    },
    _setCanScrollPrev: (can) => {
      canScrollPrev = can
    },
    _setCanScrollNext: (can) => {
      canScrollNext = can
    },
  }

  return api
}

describe('Carousel', () => {
  const mockUseEmblaCarousel = useEmblaCarousel as unknown as Mock

  beforeEach(() => {
    vi.clearAllMocks()
    // Default implementation
    mockUseEmblaCarousel.mockReturnValue([vi.fn(), undefined])
  })

  it('should throw error when useCarousel is used outside Carousel context', () => {
    // Suppress console.error for this test as React logs the error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

    expect(() => render(<Carousel.Content />)).toThrow('useCarousel must be used within a <Carousel />')

    consoleSpy.mockRestore()
  })

  it('should expose carousel API via ref and handle orientation', () => {
    const api = createMockApi()
    // eslint-disable-next-line ts/no-explicit-any
    let capturedOptions: any

    mockUseEmblaCarousel.mockImplementation((options) => {
      capturedOptions = options
      return [vi.fn(), api as unknown as CarouselApi]
    })

    // eslint-disable-next-line react/no-create-ref, ts/no-explicit-any
    const ref = React.createRef<any>()
    render(
      <Carousel ref={ref}>
        <Carousel.Content>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Content>
      </Carousel>,
    )

    expect(ref.current).not.toBeNull()
    expect(ref.current.api).toBe(api)
    expect(ref.current.scrollPrev).toBeDefined()
    expect(ref.current.scrollNext).toBeDefined()

    // Check default orientation is horizontal (axis: 'x')
    expect(capturedOptions?.axis).toBe('x')

    // Test vertical orientation
    render(
      <Carousel orientation="vertical">
        <Carousel.Content />
      </Carousel>,
    )
    expect(capturedOptions?.axis).toBe('y')
  })

  it('should render slides and update dot state on selection', () => {
    const api = createMockApi({ selectedIndex: 0, canScrollPrev: false, canScrollNext: true, slideCount: 4 })
    mockUseEmblaCarousel.mockReturnValue([vi.fn(), api as unknown as CarouselApi])

    render(
      <Carousel>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
          <Carousel.Item>3</Carousel.Item>
          <Carousel.Item>4</Carousel.Item>
        </Carousel.Content>
        <Carousel.Dot />
      </Carousel>,
    )

    const dots = screen.getAllByRole('button')
    expect(dots).toHaveLength(4)
    expect(dots[0]).toHaveAttribute('data-state', 'active')
    expect(dots[1]).toHaveAttribute('data-state', 'inactive')

    act(() => {
      api._setSelected(2)
      api.emit('select')
    })

    expect(dots[0]).toHaveAttribute('data-state', 'inactive')
    expect(dots[2]).toHaveAttribute('data-state', 'active')
  })

  it('should scroll to specific index when dot is clicked', async () => {
    const api = createMockApi()
    mockUseEmblaCarousel.mockReturnValue([vi.fn(), api as unknown as CarouselApi])
    const user = userEvent.setup()

    render(
      <Carousel>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
          <Carousel.Item>3</Carousel.Item>
        </Carousel.Content>
        <Carousel.Dot />
      </Carousel>,
    )

    const dots = screen.getAllByRole('button')
    await user.click(dots[1])

    expect(api.scrollTo).toHaveBeenCalledWith(1)
  })

  it('should handle previous and next button clicks and disabled states', async () => {
    const api = createMockApi({ selectedIndex: 0, canScrollPrev: false, canScrollNext: true, slideCount: 3 })
    mockUseEmblaCarousel.mockReturnValue([vi.fn(), api as unknown as CarouselApi])
    const user = userEvent.setup()

    render(
      <Carousel>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
          <Carousel.Item>3</Carousel.Item>
        </Carousel.Content>
        <Carousel.Previous>Prev</Carousel.Previous>
        <Carousel.Next>Next</Carousel.Next>
      </Carousel>,
    )

    const prevBtn = screen.getByText('Prev').closest('button') as HTMLButtonElement
    const nextBtn = screen.getByText('Next').closest('button') as HTMLButtonElement

    expect(prevBtn).toBeDisabled()
    expect(nextBtn).not.toBeDisabled()

    await user.click(nextBtn)
    expect(api.scrollNext).toHaveBeenCalled()

    // Update state to middle slide
    act(() => {
      api._setCanScrollPrev(true)
      api._setCanScrollNext(true)
      api.emit('select')
    })

    expect(prevBtn).not.toBeDisabled()
    expect(nextBtn).not.toBeDisabled()

    await user.click(prevBtn)
    expect(api.scrollPrev).toHaveBeenCalled()
  })

  it('should apply correct classes for vertical orientation', () => {
    mockUseEmblaCarousel.mockReturnValue([vi.fn(), createMockApi() as unknown as CarouselApi])
    const { container } = render(
      <Carousel orientation="vertical">
        <Carousel.Content>
          <Carousel.Item>Slide</Carousel.Item>
        </Carousel.Content>
      </Carousel>,
    )

    // CarouselContent should have flex-col
    expect(container.querySelector('.flex-col')).toBeInTheDocument()
  })

  it('should have correct accessibility roles', () => {
    mockUseEmblaCarousel.mockReturnValue([vi.fn(), createMockApi() as unknown as CarouselApi])
    render(
      <Carousel>
        <Carousel.Content>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Content>
      </Carousel>,
    )

    const region = screen.getByRole('region')
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')

    const slide = screen.getByRole('group')
    expect(slide).toHaveAttribute('aria-roledescription', 'slide')
  })

  it('should handle undefined api gracefully', () => {
    // useEmblaCarousel returns undefined api by default in beforeEach
    render(
      <Carousel>
        <Carousel.Content>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Content>
      </Carousel>,
    )
    // Should not crash
    expect(screen.getByRole('region')).toBeInTheDocument()
  })

  it('should handle null api in event listener without crashing', () => {
    const api = createMockApi()
    mockUseEmblaCarousel.mockReturnValue([vi.fn(), api as unknown as CarouselApi])

    render(
      <Carousel>
        <Carousel.Content>
          <Carousel.Item>Slide 1</Carousel.Item>
        </Carousel.Content>
      </Carousel>,
    )

    // Robust check: explicitly verify that triggering the event with bad data DOES NOT throw an error
    expect(() => {
      act(() => {
        // Force the callback to receive 'undefined' instead of the api instance
        api.emit('select', undefined)
      })
    }).not.toThrow()
  })
})
