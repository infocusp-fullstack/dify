import type { IHeaderProps } from './index'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useGlobalPublicStore } from '@/context/global-public-context'
import Header from './index'

type MockAppData = {
  custom_config: {
    remove_webapp_brand: boolean
    replace_webapp_logo: string | null
  }
}

type MockEmbeddedContext = {
  appData: MockAppData
  currentConversationId: string
  inputsForms: Array<{ variable: string }>
  allInputsHidden: boolean
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key.includes('poweredBy') ? 'Powered by' : key),
  }),
}))

const mockEmbeddedContext: MockEmbeddedContext = {
  appData: {
    custom_config: {
      remove_webapp_brand: false,
      replace_webapp_logo: null,
    },
  },
  currentConversationId: 'test-conversation-id',
  inputsForms: [],
  allInputsHidden: false,
}

const useEmbeddedChatbotContextMock = vi.fn(() => mockEmbeddedContext)
vi.mock('../context', () => ({
  useEmbeddedChatbotContext: () => useEmbeddedChatbotContextMock(),
}))

vi.mock('@/context/global-public-context', () => ({
  useGlobalPublicStore: vi.fn(),
}))

vi.mock('@remixicon/react', () => ({
  RiCollapseDiagonal2Line: ({ className }: { className?: string }) => <svg data-testid="icon-collapse" className={className} />,
  RiExpandDiagonal2Line: ({ className }: { className?: string }) => <svg data-testid="icon-expand" className={className} />,
  RiResetLeftLine: ({ className }: { className?: string }) => <svg data-testid="icon-reset" className={className} />,
}))

vi.mock('@/app/components/base/action-button', () => ({
  default: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
    <button data-testid="action-button" onClick={onClick}>{children}</button>
  ),
}))

vi.mock('@/app/components/base/chat/embedded-chatbot/inputs-form/view-form-dropdown', () => ({
  default: ({ iconColor }: { iconColor?: string }) => <div data-testid="view-form-dropdown" data-icon-color={iconColor} />,
}))

vi.mock('@/app/components/base/divider', () => ({
  default: ({ className }: { className?: string }) => <div data-testid="divider" className={className} />,
}))

vi.mock('@/app/components/base/logo/dify-logo', () => ({
  default: () => <div data-testid="dify-logo" />,
}))

vi.mock('@/app/components/base/tooltip', () => ({
  default: ({ children, popupContent }: { children: React.ReactNode, popupContent: string }) => (
    <div data-testid="tooltip" data-content={popupContent}>{children}</div>
  ),
}))

describe('Header Component', () => {
  const defaultProps: IHeaderProps = {
    isMobile: false,
    allowResetChat: true,
    title: 'Test Chatbot',
    onCreateNewChat: vi.fn(),
  }

  const mockGlobalStore = (features: Record<string, unknown>) => {
    (useGlobalPublicStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: { systemFeatures: Record<string, unknown> }) => unknown) => {
      return selector({ systemFeatures: features })
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGlobalStore({
      branding: { enabled: false, workspace_logo: null },
    })
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockEmbeddedContext })
  })

  describe('Desktop Layout and Branding', () => {
    it('should render the default Dify branding by default', () => {
      render(<Header {...defaultProps} />)
      expect(screen.getByText('Powered by')).toBeInTheDocument()
      expect(screen.getByTestId('dify-logo')).toBeInTheDocument()
    })

    it('should respect remove_webapp_brand configuration', () => {
      useEmbeddedChatbotContextMock.mockReturnValue({
        ...mockEmbeddedContext,
        appData: {
          custom_config: { remove_webapp_brand: true, replace_webapp_logo: null },
        },
      })
      render(<Header {...defaultProps} />)
      expect(screen.queryByText('Powered by')).not.toBeInTheDocument()
    })

    it('should display workspace logo when branding is enabled in system features', () => {
      mockGlobalStore({
        branding: { enabled: true, workspace_logo: 'http://workspace.logo/img.png' },
      })
      render(<Header {...defaultProps} />)
      const logo = screen.getByAltText('logo') as HTMLImageElement
      expect(logo.src).toBe('http://workspace.logo/img.png')
    })

    it('should prioritize appData custom logo over default Dify branding', () => {
      useEmbeddedChatbotContextMock.mockReturnValue({
        ...mockEmbeddedContext,
        appData: {
          custom_config: {
            remove_webapp_brand: false,
            replace_webapp_logo: 'http://custom.logo/img.png',
          },
        },
      })
      render(<Header {...defaultProps} />)
      const logo = screen.getByAltText('logo') as HTMLImageElement
      expect(logo.src).toBe('http://custom.logo/img.png')
    })
  })

  describe('Mobile Layout and Theming', () => {
    const mobileProps = { ...defaultProps, isMobile: true, customerIcon: <span data-testid="icon">Icon</span> }

    it('should render title and custom icon correctly', () => {
      render(<Header {...mobileProps} />)
      expect(screen.getByText('Test Chatbot')).toBeInTheDocument()
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('should apply theme styles to the header container and font', () => {
      const theme = {
        headerBorderBottomStyle: 'border-bottom: 2px solid green',
        colorFontOnHeaderStyle: 'color: blue',
        colorPathOnHeader: 'text-green-500',
      }

      render(<Header {...mobileProps} theme={theme as unknown as IHeaderProps['theme']} />)

      const headerContainer = screen.getByText('Test Chatbot').closest('.flex.h-14') as HTMLElement
      expect(headerContainer?.style.borderBottom).toContain('2px solid green')
      expect(screen.getByText('Test Chatbot')).toHaveStyle({ color: 'rgb(0, 0, 255)' })
    })
  })

  describe('Interactive Elements', () => {
    it('should handle chat reset interaction', () => {
      render(<Header {...defaultProps} />)
      const resetBtn = screen.getByTestId('icon-reset').closest('button')
      fireEvent.click(resetBtn!)
      expect(defaultProps.onCreateNewChat).toHaveBeenCalled()
    })

    it('should render view-form-dropdown when inputs are present', () => {
      useEmbeddedChatbotContextMock.mockReturnValue({
        ...mockEmbeddedContext,
        inputsForms: [{ variable: 'test' }],
        allInputsHidden: false,
      })
      render(<Header {...defaultProps} />)
      expect(screen.getByTestId('view-form-dropdown')).toBeInTheDocument()
    })

    it('should render divider when a conversation is active', () => {
      render(<Header {...defaultProps} />)
      expect(screen.getByTestId('divider')).toBeInTheDocument()
    })

    it('should render DifyLogo if branding enabled but logo missing', () => {
      mockGlobalStore({
        branding: { enabled: true, workspace_logo: null },
      })
      render(<Header {...defaultProps} />)
      expect(screen.getByTestId('dify-logo')).toBeInTheDocument()
    })
  })

  describe('Iframe and Cross-Window Communication', () => {
    let originalWindowTop: Window | null

    beforeAll(() => {
      originalWindowTop = window.top
      Object.defineProperty(window, 'top', {
        value: { postMessage: vi.fn() },
        writable: true,
      })
    })

    afterAll(() => {
      if (originalWindowTop) {
        Object.defineProperty(window, 'top', { value: originalWindowTop, writable: true })
      }
    })

    it('should post initialization message to parent window on mount', () => {
      const postMessageSpy = vi.spyOn(window.parent, 'postMessage')
      render(<Header {...defaultProps} />)
      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: 'dify-chatbot-iframe-ready' },
        expect.any(String),
      )
    })

    it('should manage expansion state based on parent window config messages', () => {
      render(<Header {...defaultProps} />)

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            type: 'dify-chatbot-config',
            payload: { isToggledByButton: true, isDraggable: false },
          },
          origin: 'http://localhost:3000',
        }))
      })

      const toggleButton = screen.getByTestId('icon-expand').closest('button')
      fireEvent.click(toggleButton!)

      expect(screen.getByTestId('icon-collapse')).toBeInTheDocument()
    })

    it('should validate message origin before updating state', () => {
      render(<Header {...defaultProps} />)

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'dify-chatbot-config', payload: { isToggledByButton: true } },
          origin: 'http://valid-origin.com',
        }))
      })

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'dify-chatbot-config', payload: { isToggledByButton: false } },
          origin: 'http://untrusted-origin.com',
        }))
      })

      expect(screen.getByTestId('icon-expand')).toBeInTheDocument()
    })

    it('should clean up message listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = render(<Header {...defaultProps} />)
      unmount()
      expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('should not handle ToggleExpand if not in iframe or button not shown', () => {
      // Mock not in iframe by setting window.top === window.self
      const originalWindowTop = window.top
      Object.defineProperty(window, 'top', {
        value: window.self,
        writable: true,
        configurable: true,
      })
      render(<Header {...defaultProps} />)
      // No expand button should be present
      expect(screen.queryByTestId('icon-expand')).not.toBeInTheDocument()

      // Restore window.top
      Object.defineProperty(window, 'top', { value: originalWindowTop, writable: true, configurable: true })
    })
  })
})
