// app/components/base/chat/embedded-chatbot/chat-wrapper.spec.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InputVarType } from '@/app/components/workflow/types'
import { AppSourceType, fetchSuggestedQuestions, stopChatMessageResponding } from '@/service/share'
import ChatWrapper from './chat-wrapper'
import { isDify } from './utils'

type MockContextValue = {
  appData: { site: { icon_type: string, icon: string, icon_background: string, icon_url: string, use_icon_as_answer_icon: boolean } }
  appParams: Record<string, unknown>
  appPrevChatList: unknown[]
  currentConversationId: string | null
  currentConversationItem: unknown
  currentConversationInputs: Record<string, unknown>
  inputsForms: unknown[]
  newConversationInputs: Record<string, unknown>
  newConversationInputsRef: { current: Record<string, unknown> }
  handleNewConversationCompleted: () => void
  isMobile: boolean
  isInstalledApp: boolean
  appId: string
  appMeta: Record<string, unknown>
  disableFeedback: boolean
  handleFeedback: () => void
  currentChatInstanceRef: { current: unknown }
  themeBuilder: Record<string, unknown>
  clearChatList: boolean
  setClearChatList: () => void
  setIsResponding: (isResponding: boolean) => void
  allInputsHidden: boolean
  initUserVariables: Record<string, unknown>
  appSourceType: string
}

type MockUseChatReturn = {
  chatList: unknown[]
  setTargetMessageId: (id: string) => void
  handleSwitchSibling?: (id: string) => void
  handleSend: (url: string, data: unknown, options?: unknown) => void
  handleStop: () => void
  isResponding: boolean
  suggestedQuestions: string[]
}

const { mockUseEmbeddedChatbotContext, mockUseChat, mockHandleSend } = vi.hoisted(() => {
  return {
    mockUseEmbeddedChatbotContext: vi.fn(),
    mockUseChat: vi.fn(),
    mockHandleSend: vi.fn(),
  }
})

vi.mock('./context', () => ({
  useEmbeddedChatbotContext: () => mockUseEmbeddedChatbotContext(),
}))

vi.mock('../chat/hooks', () => ({
  useChat: (config: unknown, inputs: unknown, prevList: unknown, stop: unknown, clear: unknown, setClear: unknown) => mockUseChat(config, inputs, prevList, stop, clear, setClear),
}))

vi.mock('@/service/share', () => ({
  AppSourceType: { webApp: 'webApp', tryApp: 'tryApp' },
  fetchSuggestedQuestions: vi.fn(),
  getUrl: (path: string) => `https://api/${path}`,
  stopChatMessageResponding: vi.fn(),
}))

vi.mock('../utils', () => ({
  getLastAnswer: (list: unknown[]) => (list.length > 0 ? list[list.length - 1] : null),
  isValidGeneratedAnswer: () => true,
}))

vi.mock('./utils', () => ({
  isDify: vi.fn(() => false),
}))

vi.mock('@/app/components/base/markdown', () => ({
  Markdown: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>,
}))

vi.mock('@/app/components/base/chat/embedded-chatbot/inputs-form', () => ({
  default: ({ collapsed }: { collapsed: boolean }) => (
    <div data-testid="inputs-form">
      Collapsed:
      {String(collapsed)}
    </div>
  ),
}))

vi.mock('@/app/components/base/app-icon', () => ({
  default: () => <div data-testid="app-icon">AppIcon</div>,
}))

vi.mock('@/app/components/base/answer-icon', () => ({
  default: () => <div data-testid="answer-icon">AnswerIcon</div>,
}))

vi.mock('@/app/components/base/logo/logo-embedded-chat-avatar', () => ({
  default: () => <div data-testid="logo-avatar">LogoAvatar</div>,
}))

vi.mock('../../avatar', () => ({
  default: () => <div data-testid="avatar">Avatar</div>,
}))

vi.mock('@/app/components/base/chat/chat/answer/suggested-questions', () => ({
  default: () => <div data-testid="suggested-questions">SuggestedQuestions</div>,
}))

type MockChatProps = {
  inputDisabled: boolean
  answerIcon: React.ReactNode
  chatNode: React.ReactNode
  onSend: (msg: string, inputs: unknown[], isFile: boolean, parentId: string | null) => void
  onRegenerate: (payload: unknown) => void
  onStopResponding: () => void
  switchSibling: (id: string) => void
  questionIcon: React.ReactNode
}

vi.mock('../chat', () => ({
  default: (props: MockChatProps) => (
    <div data-testid="chat-component">
      <div data-testid="props-input-disabled">{String(props.inputDisabled)}</div>
      <div data-testid="props-answer-icon">
        {props.answerIcon ? 'HasAnswerIcon' : 'NoAnswerIcon'}
        {props.answerIcon}
      </div>
      <div data-testid="chat-node">{props.chatNode}</div>
      <button onClick={() => props.onSend('message', [], false, null)}>Send</button>
      <button onClick={() => props.onRegenerate({ id: 'msg-id', parentMessageId: 'parent-id', content: 'regen' })}>Regenerate</button>
      <button onClick={props.onStopResponding}>Stop</button>
      <button onClick={() => props.switchSibling('new-id')}>SwitchSibling</button>
      <div data-testid="props-question-icon">{props.questionIcon}</div>
    </div>
  ),
}))

describe('ChatWrapper', () => {
  const defaultContext: MockContextValue = {
    appData: {
      site: {
        icon_type: 'emoji',
        icon: '🤖',
        icon_background: '#fff',
        icon_url: '',
        use_icon_as_answer_icon: false,
      },
    },
    appParams: {
      opening_statement: 'Welcome!',
      system_parameters: {},
    },
    appPrevChatList: [],
    currentConversationId: null,
    currentConversationItem: null,
    currentConversationInputs: {},
    inputsForms: [],
    newConversationInputs: {},
    newConversationInputsRef: { current: {} },
    handleNewConversationCompleted: vi.fn(),
    isMobile: false,
    isInstalledApp: false,
    appId: 'test-app-id',
    appMeta: { tool_icons: {} },
    disableFeedback: false,
    handleFeedback: vi.fn(),
    currentChatInstanceRef: { current: {} },
    themeBuilder: {},
    clearChatList: false,
    setClearChatList: vi.fn(),
    setIsResponding: vi.fn(),
    allInputsHidden: false,
    initUserVariables: {},
    appSourceType: AppSourceType.webApp,
  }

  const defaultUseChat: MockUseChatReturn = {
    chatList: [],
    setTargetMessageId: vi.fn(),
    handleSwitchSibling: vi.fn(),
    handleSend: mockHandleSend,
    handleStop: vi.fn(),
    isResponding: false,
    suggestedQuestions: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEmbeddedChatbotContext.mockReturnValue(defaultContext)
    mockUseChat.mockReturnValue(defaultUseChat)
  })

  it('renders the Chat wrapper component and mounts the Chat child', () => {
    render(<ChatWrapper />)
    expect(screen.getByTestId('chat-component')).toBeInTheDocument()
  })

  it('calls handleSend with constructed URL and payload when Send is clicked', async () => {
    render(<ChatWrapper />)
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))
    expect(mockHandleSend).toHaveBeenCalled()
    const args = mockHandleSend.mock.lastCall
    expect(args).toBeDefined()
    if (!args)
      return

    expect(args[0]).toContain('chat-messages')
    expect(args[1]).toMatchObject({
      query: 'message',
      inputs: {},
    })
  })

  it('calls handleSend with the original question and correct parent_message_id on regenerate', async () => {
    const chatListWithHistory = [
      { id: 'grandparent-id', content: 'grandparent', isOpeningStatement: false },
      { id: 'parent-id', content: 'original-query', parentMessageId: 'grandparent-id' },
      { id: 'msg-id', content: 'answer', parentMessageId: 'parent-id' },
    ]
    mockUseChat.mockReturnValue({
      ...defaultUseChat,
      chatList: chatListWithHistory,
    })

    render(<ChatWrapper />)
    await userEvent.click(screen.getByRole('button', { name: /Regenerate/i }))
    expect(mockHandleSend).toHaveBeenCalled()
    const args = mockHandleSend.mock.lastCall
    expect(args).toBeDefined()
    if (!args)
      return

    expect(args[1]).toMatchObject({
      query: 'original-query',
      parent_message_id: 'grandparent-id',
    })
  })

  it('calls the chat hook handleStop when Stop is clicked', async () => {
    const mockStop = vi.fn()
    mockUseChat.mockReturnValue({
      ...defaultUseChat,
      handleStop: mockStop,
    })

    render(<ChatWrapper />)
    await userEvent.click(screen.getByRole('button', { name: /Stop/i }))
    expect(mockStop).toHaveBeenCalled()
  })

  it('calls setTargetMessageId when SwitchSibling is clicked', async () => {
    const mockSetTarget = vi.fn()
    mockUseChat.mockReturnValue({
      ...defaultUseChat,
      setTargetMessageId: mockSetTarget,
      handleSwitchSibling: mockSetTarget,
    })

    render(<ChatWrapper />)
    await userEvent.click(screen.getByRole('button', { name: /SwitchSibling/i }))
    expect(mockSetTarget).toHaveBeenCalledWith('new-id')
  })

  it('does not render opening statement when inputs form is visible and expanded', () => {
    const welcomeContent = 'Welcome!'
    mockUseChat.mockReturnValue({
      ...defaultUseChat,
      chatList: [{ id: 'welcome', isOpeningStatement: true, content: welcomeContent }],
    })
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      inputsForms: [{ variable: 'name', type: 'text' }],
      allInputsHidden: false,
    })

    render(<ChatWrapper />)
    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument()
  })

  it('calculates inputDisabled correctly (required text field missing)', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      inputsForms: [
        { variable: 'name', label: 'Name', required: true, type: InputVarType.textInput },
      ],
      newConversationInputsRef: { current: {} },
    })

    render(<ChatWrapper />)
    expect(screen.getByTestId('props-input-disabled')).toHaveTextContent('true')
  })

  it('calculates inputDisabled correctly (file uploading)', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      inputsForms: [
        { variable: 'file', label: 'File', required: true, type: InputVarType.singleFile },
      ],
      newConversationInputsRef: {
        current: {
          file: { transferMethod: 'local_file', uploadedId: '' },
        },
      },
    })

    render(<ChatWrapper />)
    expect(screen.getByTestId('props-input-disabled')).toHaveTextContent('true')
  })

  it('calculates inputDisabled correctly (valid inputs)', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      inputsForms: [
        { variable: 'name', label: 'Name', required: true, type: InputVarType.textInput },
      ],
      newConversationInputsRef: { current: { name: 'Poojan' } },
    })

    render(<ChatWrapper />)
    expect(screen.getByTestId('props-input-disabled')).toHaveTextContent('false')
  })

  it('renders welcome message when appropriate', () => {
    const welcomeContent = 'Welcome to the bot!'
    mockUseChat.mockReturnValue({
      ...defaultUseChat,
      chatList: [{ id: 'welcome', isOpeningStatement: true, content: welcomeContent }],
    })

    render(<ChatWrapper />)
    expect(screen.getByTestId('markdown')).toHaveTextContent(welcomeContent)
    expect(screen.getByTestId('app-icon')).toBeInTheDocument()
  })

  it('renders welcome message with suggested questions', () => {
    const welcomeContent = 'Welcome!'
    mockUseChat.mockReturnValue({
      ...defaultUseChat,
      chatList: [{
        id: 'welcome',
        isOpeningStatement: true,
        content: welcomeContent,
        suggestedQuestions: ['Q1'],
      }],
    })

    render(<ChatWrapper />)
    expect(screen.getByTestId('suggested-questions')).toBeInTheDocument()
  })

  it('renders inputs form in chat node on mobile', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      isMobile: true,
      inputsForms: [{ variable: 'name', label: 'Name', type: 'text' }],
    })

    render(<ChatWrapper />)
    const forms = screen.getAllByTestId('inputs-form')
    expect(forms.length).toBeGreaterThan(0)
  })

  it('shows answer icon from site config', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      appData: {
        site: {
          ...defaultContext.appData.site,
          use_icon_as_answer_icon: true,
          icon_url: 'http://icon.png',
        },
      },
    })

    render(<ChatWrapper />)
    expect(screen.getByTestId('props-answer-icon')).toHaveTextContent('HasAnswerIcon')
  })

  it('renders spacer on mobile with active conversation', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      isMobile: true,
      currentConversationId: 'active-id',
      inputsForms: [{ variable: 'name', type: 'text' }],
    })

    const { container } = render(<ChatWrapper />)
    const spacer = container.querySelector('.mb-4')
    expect(spacer).toBeInTheDocument()
    expect(screen.queryByTestId('inputs-form')).not.toBeInTheDocument()
  })

  it('hides welcome message when responding', () => {
    mockUseChat.mockReturnValue({
      ...defaultUseChat,
      isResponding: true,
      chatList: [{ id: 'welcome', isOpeningStatement: true, content: 'Welcome' }],
    })

    render(<ChatWrapper />)
    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument()
  })

  it('hides welcome message when active conversation exists', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      currentConversationId: 'active-id',
    })
    mockUseChat.mockReturnValue({
      ...defaultUseChat,
      chatList: [{ id: 'welcome', isOpeningStatement: true, content: 'Welcome' }],
    })

    render(<ChatWrapper />)
    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument()
  })

  it('hides app-icon when appData.site is missing', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      appData: {},
    })
    mockUseChat.mockReturnValue({
      ...defaultUseChat,
      chatList: [{ id: 'welcome', isOpeningStatement: true, content: 'Welcome' }],
    })

    render(<ChatWrapper />)
    expect(screen.queryByTestId('app-icon')).not.toBeInTheDocument()
  })

  it('handles multiple files upload (array)', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      inputsForms: [{ variable: 'files', label: 'Files', required: true, type: InputVarType.multiFiles }],
      newConversationInputsRef: {
        current: {
          files: [
            { transferMethod: 'local_file', uploadedId: '123' },
            { transferMethod: 'local_file', uploadedId: '' },
          ],
        },
      },
    })
    render(<ChatWrapper />)
    expect(screen.getByTestId('props-input-disabled')).toHaveTextContent('true')
  })

  it('short-circuits validation when file is uploading', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      inputsForms: [
        { variable: 'file1', label: 'F1', required: true, type: InputVarType.singleFile },
        { variable: 'file2', label: 'F2', required: true, type: InputVarType.singleFile },
      ],
      newConversationInputsRef: {
        current: {
          file1: { transferMethod: 'local_file', uploadedId: '' },
          file2: { transferMethod: 'local_file', uploadedId: '123' },
        },
      },
    })
    render(<ChatWrapper />)
    expect(screen.getByTestId('props-input-disabled')).toHaveTextContent('true')
  })

  it('calls onGetSuggestedQuestions callback from options passed to handleSend', async () => {
    render(<ChatWrapper />)
    await userEvent.click(screen.getByRole('button', { name: /Send/i }))

    expect(mockHandleSend).toHaveBeenCalled()
    const lastCall = mockHandleSend.mock.lastCall
    expect(lastCall).toBeDefined()
    if (!lastCall)
      return

    const options = lastCall[2]
    expect(options).toHaveProperty('onGetSuggestedQuestions')

    options.onGetSuggestedQuestions('response-id')
    expect(fetchSuggestedQuestions).toHaveBeenCalledWith('response-id', 'webApp', 'test-app-id')
  })

  it('returns inputDisabled=false when allInputsHidden is true', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      allInputsHidden: true,
      inputsForms: [{ variable: 'name', label: 'Name', required: true, type: InputVarType.textInput }],
      newConversationInputsRef: { current: {} },
    })

    render(<ChatWrapper />)
    expect(screen.getByTestId('props-input-disabled')).toHaveTextContent('false')
  })

  it('short-circuits validation when required field is empty', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      inputsForms: [
        { variable: 'name1', label: 'Name1', required: true, type: InputVarType.textInput },
        { variable: 'name2', label: 'Name2', required: true, type: InputVarType.textInput },
      ],
      newConversationInputsRef: { current: {} },
    })

    render(<ChatWrapper />)
    expect(screen.getByTestId('props-input-disabled')).toHaveTextContent('true')
  })

  it('calls stopChatMessageResponding when handleStop is triggered', () => {
    let capturedStopCallback: (id: string) => void = () => { }
    mockUseChat.mockImplementation((_c, _i, _p, stopCallback) => {
      capturedStopCallback = stopCallback
      return defaultUseChat
    })

    render(<ChatWrapper />)
    capturedStopCallback('task-id')
    expect(stopChatMessageResponding).toHaveBeenCalledWith('', 'task-id', 'webApp', 'test-app-id')
  })

  it('renders LogoAvatar when isDify returns true', () => {
    const mockIsDify = isDify as unknown as ReturnType<typeof vi.fn>
    mockIsDify.mockReturnValue(true)

    render(<ChatWrapper />)
    expect(screen.getByTestId('logo-avatar')).toBeInTheDocument()

    mockIsDify.mockReturnValue(false)
  })

  it('renders user avatar when initUserVariables has avatar_url', () => {
    mockUseEmbeddedChatbotContext.mockReturnValue({
      ...defaultContext,
      initUserVariables: { avatar_url: 'http://avatar.com', name: 'User' },
    })

    render(<ChatWrapper />)
    expect(screen.getByTestId('props-question-icon')).toHaveTextContent('Avatar')
  })
})
