import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { downloadUrl } from '@/utils/download'
import ShareQRCode from '.'

vi.mock('@/utils/download', () => ({
  downloadUrl: vi.fn(),
}))

// Mock qrcode.react to render a simple canvas or something else for testing
vi.mock('qrcode.react', () => ({
  QRCodeCanvas: (props: { value: string } & React.CanvasHTMLAttributes<HTMLCanvasElement>) => {
    if (props.value === 'no-canvas')
      return <div data-testid="no-canvas" />
    return <canvas data-testid="mock-qrcode-canvas" {...props} />
  },
}))

describe('ShareQRCode', () => {
  const content = 'https://example.com'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    const { container } = render(<ShareQRCode content={content} />)
    expect(container.querySelector('.remixicon')).toBeInTheDocument()
  })

  it('toggles QR code panel when clicking the icon', async () => {
    const user = userEvent.setup()
    const { container } = render(<ShareQRCode content={content} />)

    expect(screen.queryByTestId('mock-qrcode-canvas')).not.toBeInTheDocument()

    const trigger = container.querySelector('.relative.h-6.w-6')
    await user.click(trigger!)

    expect(screen.getByTestId('mock-qrcode-canvas')).toBeInTheDocument()

    await user.click(trigger!)
    expect(screen.queryByTestId('mock-qrcode-canvas')).not.toBeInTheDocument()
  })

  it('closes panel when clicking outside', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <div>
        <div data-testid="outside">Outside</div>
        <ShareQRCode content={content} />
      </div>,
    )

    const trigger = container.querySelector('.relative.h-6.w-6')
    await user.click(trigger!)
    expect(screen.getByTestId('mock-qrcode-canvas')).toBeInTheDocument()

    await user.click(screen.getByTestId('outside'))
    expect(screen.queryByTestId('mock-qrcode-canvas')).not.toBeInTheDocument()
  })

  it('does not close panel when clicking inside the panel', async () => {
    const user = userEvent.setup()
    const { container } = render(<ShareQRCode content={content} />)

    const trigger = container.querySelector('.relative.h-6.w-6')
    await user.click(trigger!)

    const panel = screen.getByTestId('mock-qrcode-canvas').parentElement
    await user.click(panel!)

    expect(screen.getByTestId('mock-qrcode-canvas')).toBeInTheDocument()
  })

  it('calls downloadUrl when clicking download', async () => {
    const user = userEvent.setup()
    // Need to mock toDataURL on canvas
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,test')

    try {
      const { container } = render(<ShareQRCode content={content} />)

      const trigger = container.querySelector('.relative.h-6.w-6')
      await user.click(trigger!)

      const downloadBtn = screen.getByText('appOverview.overview.appInfo.qrcode.download')
      await user.click(downloadBtn)

      expect(downloadUrl).toHaveBeenCalledWith({
        url: 'data:image/png;base64,test',
        fileName: 'qrcode.png',
      })
    }
    finally {
      HTMLCanvasElement.prototype.toDataURL = originalToDataURL
    }
  })

  it('does not call downloadUrl if canvas is missing', async () => {
    const user = userEvent.setup()
    const { container } = render(<ShareQRCode content="no-canvas" />)

    const trigger = container.querySelector('.relative.h-6.w-6')
    await user.click(trigger!)

    const downloadBtn = screen.getByText('appOverview.overview.appInfo.qrcode.download')
    await user.click(downloadBtn)

    expect(downloadUrl).not.toHaveBeenCalled()
  })
})
