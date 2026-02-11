import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SVGRenderer from '.'

// Mock ImagePreview
vi.mock('@/app/components/base/image-uploader/image-preview', () => ({
  default: ({ url, onCancel }: { url: string, onCancel: () => void }) => (
    <div data-testid="image-preview">
      <span data-testid="preview-url">{url}</span>
      <button onClick={onCancel}>Close</button>
    </div>
  ),
}))

// Mock svg.js
const mockClick = vi.fn()
const mockSvg = vi.fn().mockReturnValue({
  click: mockClick,
})
const mockViewbox = vi.fn()
const mockAddTo = vi.fn()

vi.mock('@svgdotjs/svg.js', () => ({
  SVG: vi.fn().mockImplementation(() => ({
    addTo: mockAddTo,
  })),
}))

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: (content: string) => content,
  },
}))

describe('SVGRenderer', () => {
  const validSvg = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>'

  beforeEach(() => {
    vi.clearAllMocks()
    mockAddTo.mockReturnValue({
      viewbox: mockViewbox,
      svg: mockSvg,
    })
    mockSvg.mockReturnValue({
      click: mockClick,
    })

    // Mock DOMParser to return a proper SVGElement by default
    const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    mockSvgElement.setAttribute('width', '100')
    mockSvgElement.setAttribute('height', '100')
    vi.spyOn(DOMParser.prototype, 'parseFromString').mockReturnValue({
      documentElement: mockSvgElement,
    } as unknown as Document)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders correctly with content', async () => {
    render(<SVGRenderer content={validSvg} />)

    await waitFor(() => {
      expect(mockViewbox).toHaveBeenCalledWith(0, 0, 100, 100)
    })
    expect(mockSvg).toHaveBeenCalledWith(validSvg)
  })

  it('shows error message on invalid SVG content', async () => {
    const originalParseFromString = DOMParser.prototype.parseFromString
    DOMParser.prototype.parseFromString = vi.fn().mockReturnValue({
      documentElement: document.createElement('div'), // Not an SVGElement
    })

    render(<SVGRenderer content="invalid" />)

    await waitFor(() => {
      expect(screen.getByText(/Error rendering SVG/)).toBeInTheDocument()
    })

    DOMParser.prototype.parseFromString = originalParseFromString
  })

  it('opens image preview on click', async () => {
    render(<SVGRenderer content={validSvg} />)

    await waitFor(() => {
      expect(mockClick).toHaveBeenCalled()
    })
    const clickHandler = mockClick.mock.calls[0][0]

    await act(async () => {
      clickHandler()
    })

    expect(screen.getByTestId('image-preview')).toBeInTheDocument()
    expect(screen.getByTestId('preview-url').textContent).toContain('data:image/svg+xml;base64')
  })

  it('closes image preview on cancel', async () => {
    render(<SVGRenderer content={validSvg} />)

    await waitFor(() => {
      expect(mockClick).toHaveBeenCalled()
    })
    const clickHandler = mockClick.mock.calls[0][0]
    await act(async () => {
      clickHandler()
    })

    expect(screen.getByTestId('image-preview')).toBeInTheDocument()

    const closeBtn = screen.getByText('Close')
    fireEvent.click(closeBtn)

    expect(screen.queryByTestId('image-preview')).not.toBeInTheDocument()
  })

  it('re-renders on window resize', async () => {
    render(<SVGRenderer content={validSvg} />)
    await waitFor(() => {
      expect(mockAddTo).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })

    await waitFor(() => {
      expect(mockAddTo).toHaveBeenCalledTimes(2)
    })
  })

  it('uses default values for width/height if not present', async () => {
    const originalParseFromString = DOMParser.prototype.parseFromString
    const mockSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    DOMParser.prototype.parseFromString = vi.fn().mockReturnValue({
      documentElement: mockSvgElement,
    })

    render(<SVGRenderer content="<svg></svg>" />)

    await waitFor(() => {
      expect(mockViewbox).toHaveBeenCalledWith(0, 0, 400, 600)
    })

    DOMParser.prototype.parseFromString = originalParseFromString
  })
})
