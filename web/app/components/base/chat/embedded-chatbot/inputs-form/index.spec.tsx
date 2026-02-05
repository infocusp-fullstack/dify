import { fireEvent, render, screen } from '@testing-library/react'
import { AppSourceType } from '@/service/share'
import InputsFormNode from './index'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/chat/embedded-chatbot/inputs-form/content', () => ({
  default: () => <div data-testid="inputs-form-content">InputsFormContent</div>,
}))

vi.mock('@/app/components/base/divider', () => ({
  default: () => <div data-testid="divider">Divider</div>,
}))

vi.mock('@/app/components/base/icons/src/public/other', () => ({
  Message3Fill: () => <svg data-testid="message-icon" />,
}))

const mockContext = {
  appSourceType: AppSourceType.tryApp,
  isMobile: false,
  currentConversationId: 'test_conversation_id',
  themeBuilder: { theme: { primaryColor: '#123456' } },
  handleStartChat: vi.fn(),
  allInputsHidden: false,
  inputsForms: ['form1'],
}

const useEmbeddedChatbotContextMock = vi.fn(() => mockContext)
vi.mock('../context', () => ({
  useEmbeddedChatbotContext: () => useEmbeddedChatbotContextMock(),
}))

describe('InputsFormNode', () => {
  const defaultProps = {
    collapsed: false,
    setCollapsed: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockContext })
  })

  it('should render nothing when all inputs are hidden', () => {
    useEmbeddedChatbotContextMock.mockReturnValue({
      ...mockContext,
      allInputsHidden: true,
    })
    const { container } = render(<InputsFormNode {...defaultProps} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('should render nothing when inputs forms list is empty', () => {
    useEmbeddedChatbotContextMock.mockReturnValue({
      ...mockContext,
      inputsForms: [],
    })
    const { container } = render(<InputsFormNode {...defaultProps} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('should render in expanded state with correct elements', () => {
    render(<InputsFormNode {...defaultProps} />)

    expect(screen.getByText('chat.chatSettingsTitle')).toBeInTheDocument()
    expect(screen.getByTestId('message-icon')).toBeInTheDocument()
    expect(screen.getByTestId('inputs-form-content')).toBeInTheDocument()
    expect(screen.getByText('operation.close')).toBeInTheDocument()
  })

  it('should call setCollapsed(true) when close button is clicked', () => {
    render(<InputsFormNode {...defaultProps} />)

    const closeButton = screen.getByText('operation.close')
    fireEvent.click(closeButton)
    expect(defaultProps.setCollapsed).toHaveBeenCalledWith(true)
  })

  it('should render in collapsed state with edit button and dividers', () => {
    render(<InputsFormNode {...defaultProps} collapsed={true} />)

    expect(screen.getByText('operation.edit')).toBeInTheDocument()
    expect(screen.queryByTestId('inputs-form-content')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('divider')).toHaveLength(2)
  })

  it('should call setCollapsed(false) when edit button is clicked', () => {
    render(<InputsFormNode {...defaultProps} collapsed={true} />)

    const editButton = screen.getByText('operation.edit')
    fireEvent.click(editButton)
    expect(defaultProps.setCollapsed).toHaveBeenCalledWith(false)
  })

  it('should render "Start Chat" button when no current conversation exists', () => {
    useEmbeddedChatbotContextMock.mockReturnValue({
      ...mockContext,
      currentConversationId: '',
    })
    render(<InputsFormNode {...defaultProps} />)

    expect(screen.getByText('chat.startChat')).toBeInTheDocument()
    expect(screen.queryByText('operation.close')).not.toBeInTheDocument()
  })

  it('should handle "Start Chat" click and collapse the form', () => {
    useEmbeddedChatbotContextMock.mockReturnValue({
      ...mockContext,
      currentConversationId: '',
      handleStartChat: vi.fn(callback => callback()),
    })
    render(<InputsFormNode {...defaultProps} />)

    const startButton = screen.getByText('chat.startChat')
    fireEvent.click(startButton)

    expect(defaultProps.setCollapsed).toHaveBeenCalledWith(true)
  })

  it('should apply mobile-specific classes when isMobile is true', () => {
    useEmbeddedChatbotContextMock.mockReturnValue({
      ...mockContext,
      isMobile: true,
      appSourceType: AppSourceType.webApp,
    })
    const { container } = render(<InputsFormNode {...defaultProps} />)
    expect(container.firstChild).toHaveClass('mb-4')
  })

  it('should apply default spacing when appSourceType is not tryApp', () => {
    useEmbeddedChatbotContextMock.mockReturnValue({
      ...mockContext,
      appSourceType: AppSourceType.webApp,
    })
    const { container } = render(<InputsFormNode {...defaultProps} />)
    expect(container.firstChild).toHaveClass('mb-6')
  })

  it('should apply zero margin when appSourceType is tryApp', () => {
    useEmbeddedChatbotContextMock.mockReturnValue({
      ...mockContext,
      appSourceType: AppSourceType.tryApp,
    })
    const { container } = render(<InputsFormNode {...defaultProps} />)
    expect(container.firstChild).toHaveClass('mb-0')
  })

  it('should apply theme primary color to Start Chat button', () => {
    useEmbeddedChatbotContextMock.mockReturnValue({
      ...mockContext,
      currentConversationId: '',
      themeBuilder: { theme: { primaryColor: '#ff0000' } },
    })
    render(<InputsFormNode {...defaultProps} />)

    const startButton = screen.getByText('chat.startChat')
    expect(startButton).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' })
  })
})
