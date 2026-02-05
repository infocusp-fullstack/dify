import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaType } from '@/hooks/use-breakpoints'
import EmbeddedChatbot from './index'

type MockState = {
  systemFeatures: {
    branding: {
      enabled: boolean
      workspace_logo?: string
    }
  }
}
type GlobalStoreSelector = (state: MockState) => unknown

const { mockUseBreakpoints, mockUseGlobalPublicStore, mockUseEmbeddedChatbot } = vi.hoisted(() => {
  return {
    mockUseBreakpoints: vi.fn(),
    mockUseGlobalPublicStore: vi.fn(),
    mockUseEmbeddedChatbot: vi.fn(),
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/hooks/use-breakpoints', () => ({
  default: () => mockUseBreakpoints(),
  MediaType: {
    mobile: 'mobile',
    tablet: 'tablet',
    pc: 'pc',
  },
}))

vi.mock('@/hooks/use-document-title', () => ({
  default: vi.fn(),
}))

vi.mock('@/context/global-public-context', () => ({
  useGlobalPublicStore: (selector: GlobalStoreSelector) => mockUseGlobalPublicStore(selector),
}))

vi.mock('./theme/theme-context', () => ({
  useThemeContext: () => ({
    theme: { backgroundHeaderColorStyle: 'red' },
    buildTheme: vi.fn(),
  }),
}))

vi.mock('./theme/utils', () => ({
  CssTransform: (color: string) => ({ background: color }),
}))

vi.mock('./utils', () => ({
  isDify: vi.fn(() => true),
}))

vi.mock('./hooks', () => ({
  useEmbeddedChatbot: () => mockUseEmbeddedChatbot(),
}))

vi.mock('@/app/components/base/chat/embedded-chatbot/chat-wrapper', () => ({
  default: () => <div data-testid="chat-wrapper">ChatWrapper</div>,
}))

vi.mock('@/app/components/base/chat/embedded-chatbot/header', () => ({
  // eslint-disable-next-line ts/no-explicit-any
  default: (props: any) => (
    <div data-testid="header">
      Header -
      {' '}
      {props.title}
      {' '}
      - Mobile:
      {String(props.isMobile)}
    </div>
  ),
}))

vi.mock('@/app/components/base/loading', () => ({
  default: () => <div data-testid="loading">Loading...</div>,
}))

vi.mock('@/app/components/base/logo/dify-logo', () => ({
  default: () => <div data-testid="dify-logo">DifyLogo</div>,
}))

vi.mock('@/app/components/base/logo/logo-embedded-chat-header', () => ({
  default: () => <div data-testid="logo-header">LogoHeader</div>,
}))

describe('EmbeddedChatbot Component', () => {
  const defaultMockReturn = {
    appData: {
      site: { title: 'Test Chat', chat_color_theme: 'blue', chat_color_theme_inverted: false },
      custom_config: {},
    },
    appParams: {},
    appMeta: {},
    appChatListDataLoading: false,
    currentConversationId: '',
    currentConversationItem: null,
    appPrevChatList: [],
    pinnedConversationList: [],
    conversationList: [],
    newConversationInputs: {},
    newConversationInputsRef: { current: {} },
    handleNewConversationInputsChange: vi.fn(),
    inputsForms: [],
    handleNewConversation: vi.fn(),
    handleStartChat: vi.fn(),
    handleChangeConversation: vi.fn(),
    handleNewConversationCompleted: vi.fn(),
    chatShouldReloadKey: 'key-1',
    isInstalledApp: false,
    allowResetChat: true,
    appId: 'app-id',
    handleFeedback: vi.fn(),
    currentChatInstanceRef: { current: null },
    clearChatList: false,
    setClearChatList: vi.fn(),
    isResponding: false,
    setIsResponding: vi.fn(),
    currentConversationInputs: {},
    setCurrentConversationInputs: vi.fn(),
    allInputsHidden: false,
    initUserVariables: [],
  }

  const defaultSystemFeatures = {
    branding: {
      enabled: true,
      workspace_logo: 'http://workspace-logo.com/logo.png',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBreakpoints.mockReturnValue(MediaType.pc)
    mockUseEmbeddedChatbot.mockReturnValue(defaultMockReturn)
    mockUseGlobalPublicStore.mockImplementation((selector: GlobalStoreSelector) => selector({
      systemFeatures: defaultSystemFeatures,
    }))
  })

  it('renders correctly', () => {
    render(<EmbeddedChatbot />)
    expect(screen.getByTestId('chat-wrapper')).toBeInTheDocument()
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('renders loading state when appChatListDataLoading is true', () => {
    mockUseEmbeddedChatbot.mockReturnValue({
      ...defaultMockReturn,
      appChatListDataLoading: true,
    })
    render(<EmbeddedChatbot />)
    expect(screen.getByTestId('loading')).toBeInTheDocument()
    expect(screen.queryByTestId('chat-wrapper')).not.toBeInTheDocument()
  })

  it('renders desktop layout by default', () => {
    const { container } = render(<EmbeddedChatbot />)
    const containerDiv = container.querySelector('.bg-chatbot-bg')
    expect(containerDiv).toBeInTheDocument()
    const mainDiv = container.querySelector('.flex.flex-col.rounded-2xl')
    expect(mainDiv).not.toHaveStyle('background: red')
  })

  it('renders mobile layout correctly', () => {
    mockUseBreakpoints.mockReturnValue(MediaType.mobile)
    const { container } = render(<EmbeddedChatbot />)
    expect(screen.getByTestId('header')).toHaveTextContent('Mobile:true')
    expect(screen.getByText('chat.poweredBy')).toBeInTheDocument()
    const mainDiv = container.querySelector('.flex.flex-col.rounded-2xl')
    expect(mainDiv).toBeInTheDocument()
    expect(mainDiv).toHaveStyle('background: red')
  })

  it('renders branding correctly (Workspace Logo)', () => {
    mockUseBreakpoints.mockReturnValue(MediaType.mobile)
    render(<EmbeddedChatbot />)
    const logo = screen.getByAltText('logo') as HTMLImageElement
    expect(logo.src).toBe('http://workspace-logo.com/logo.png')
  })

  it('renders branding correctly (Custom Webapp Logo)', () => {
    mockUseBreakpoints.mockReturnValue(MediaType.mobile)
    mockUseGlobalPublicStore.mockImplementation((selector: GlobalStoreSelector) => selector({
      systemFeatures: { branding: { enabled: false } },
    }))
    mockUseEmbeddedChatbot.mockReturnValue({
      ...defaultMockReturn,
      appData: {
        ...defaultMockReturn.appData,
        custom_config: { replace_webapp_logo: 'http://custom-logo.com/logo.png' },
      },
    })
    render(<EmbeddedChatbot />)
    const logo = screen.getByAltText('logo') as HTMLImageElement
    expect(logo.src).toBe('http://custom-logo.com/logo.png')
  })

  it('renders branding correctly (Default Dify Logo)', () => {
    mockUseBreakpoints.mockReturnValue(MediaType.mobile)
    mockUseGlobalPublicStore.mockImplementation((selector: GlobalStoreSelector) => selector({
      systemFeatures: { branding: { enabled: false } },
    }))
    mockUseEmbeddedChatbot.mockReturnValue({
      ...defaultMockReturn,
      appData: {
        ...defaultMockReturn.appData,
        custom_config: { replace_webapp_logo: '' },
      },
    })
    render(<EmbeddedChatbot />)
    expect(screen.getByTestId('dify-logo')).toBeInTheDocument()
  })

  it('hides branding when remove_webapp_brand is true', () => {
    mockUseBreakpoints.mockReturnValue(MediaType.mobile)
    mockUseEmbeddedChatbot.mockReturnValue({
      ...defaultMockReturn,
      appData: {
        ...defaultMockReturn.appData,
        custom_config: { remove_webapp_brand: true },
      },
    })
    render(<EmbeddedChatbot />)
    expect(screen.queryByText('chat.poweredBy')).not.toBeInTheDocument()
  })
})
