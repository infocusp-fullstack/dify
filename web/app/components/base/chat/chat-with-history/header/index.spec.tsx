import type { ChatWithHistoryContextValue } from '../context'
import type { AppData, ConversationItem } from '@/models/share'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatWithHistoryContext } from '../context'
import Header from './index'

vi.mock('@/utils/classnames', () => ({
  cn: (...inputs: Array<string | boolean | undefined>) => inputs.filter(Boolean).join(' '),
}))

vi.mock('../context', () => ({
  useChatWithHistoryContext: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/action-button', () => ({
  __esModule: true,
  default: ({ children, onClick, disabled, className, state }: { children: React.ReactNode, onClick?: () => void, disabled?: boolean, className?: string, state?: string }) => (
    <button
      onClick={onClick}
      disabled={disabled || state === 'disabled'}
      className={className}
      data-testid="action-button"
    >
      {children}
    </button>
  ),
  ActionButtonState: {
    Disabled: 'disabled',
    Default: 'default',
  },
}))

vi.mock('@/app/components/base/app-icon', () => ({
  __esModule: true,
  default: () => <div data-testid="app-icon" />,
}))

vi.mock('./operation', () => ({
  __esModule: true,
  default: ({ title, togglePin, onRenameConversation, onDelete }: { title: string, togglePin: () => void, onRenameConversation: () => void, onDelete: () => void }) => (
    <div data-testid="operation-menu">
      <span>{title}</span>
      <button onClick={togglePin}>Pin</button>
      <button onClick={onRenameConversation}>Rename</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  ),
}))

vi.mock('@/app/components/base/chat/chat-with-history/inputs-form/view-form-dropdown', () => ({
  __esModule: true,
  default: () => <div data-testid="view-form-dropdown" />,
}))

vi.mock('@/app/components/base/confirm', () => ({
  __esModule: true,
  default: ({ isShow, onConfirm, onCancel }: { isShow: boolean, onConfirm?: () => void, onCancel?: () => void }) => isShow
    ? (
        <div data-testid="confirm-modal">
          <button onClick={onConfirm}>Confirm Delete</button>
          <button onClick={onCancel}>Cancel Delete</button>
        </div>
      )
    : null,
}))

vi.mock('@/app/components/base/chat/chat-with-history/sidebar/rename-modal', () => ({
  __esModule: true,
  default: ({ isShow, onSave, onClose }: { isShow: boolean, onSave?: (name: string) => void, onClose?: () => void }) => isShow
    ? (
        <div data-testid="rename-modal">
          <button onClick={() => onSave && onSave('New Name')}>Save Rename</button>
          <button onClick={onClose}>Cancel Rename</button>
        </div>
      )
    : null,
}))

vi.mock('@/app/components/base/tooltip', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockAppData: AppData = {
  app_id: 'app-1',
  site: {
    title: 'Test App',
    icon_type: 'emoji',
    icon: '🤖',
    icon_background: '#fff',
  },
  end_user_id: 'user-1',
  custom_config: null,
}

const mockContextDefaults: Partial<ChatWithHistoryContextValue> = {
  appData: mockAppData,
  currentConversationId: '',
  currentConversationItem: undefined,
  inputsForms: [],
  pinnedConversationList: [],
  handlePinConversation: vi.fn(),
  handleUnpinConversation: vi.fn(),
  handleRenameConversation: vi.fn(),
  handleDeleteConversation: vi.fn(),
  handleNewConversation: vi.fn(),
  sidebarCollapseState: true,
  handleSidebarCollapse: vi.fn(),
  isResponding: false,
  conversationRenaming: false,
}

const setup = (overrides: Partial<ChatWithHistoryContextValue> = {}) => {
  vi.mocked(useChatWithHistoryContext).mockReturnValue({
    ...mockContextDefaults,
    ...overrides,
  } as ChatWithHistoryContextValue)
  return render(<Header />)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Header Component', () => {
  it('renders app title and app icon when no conversation is selected', () => {
    setup()
    expect(screen.getByText('Test App')).toBeInTheDocument()
    expect(screen.getByTestId('app-icon')).toBeInTheDocument()
  })

  it('invokes handleSidebarCollapse when sidebar button is clicked', () => {
    const handleSidebarCollapse = vi.fn()
    setup({ handleSidebarCollapse, sidebarCollapseState: true })
    const sidebarBtn = screen.getAllByTestId('action-button')[0]
    fireEvent.click(sidebarBtn)
    expect(handleSidebarCollapse).toHaveBeenCalledWith(false)
  })

  it('shows conversation title and operation menu when a conversation is active', () => {
    const mockConv: ConversationItem = { id: 'conv-1', name: 'My Chat', inputs: null, introduction: '' }
    setup({ currentConversationId: 'conv-1', currentConversationItem: mockConv, sidebarCollapseState: true })
    expect(screen.getByTestId('operation-menu')).toBeInTheDocument()
    expect(screen.getByText('My Chat')).toBeInTheDocument()
  })

  it('calls handleNewConversation when new chat button is clicked', () => {
    const handleNewConversation = vi.fn()
    setup({ handleNewConversation, sidebarCollapseState: true, currentConversationId: 'conv-1' })
    const newChatBtn = screen.getAllByTestId('action-button')[1]
    fireEvent.click(newChatBtn)
    expect(handleNewConversation).toHaveBeenCalled()
  })

  it('disables new chat button when the chat is responding', () => {
    setup({ isResponding: true, sidebarCollapseState: true, currentConversationId: 'conv-1' })
    const newChatBtn = screen.getAllByTestId('action-button')[1]
    expect(newChatBtn).toBeDisabled()
  })

  it('renders reset chat button and the form dropdown when inputs exist', () => {
    setup({ currentConversationId: 'conv-1', inputsForms: [{}] })
    expect(screen.getByTestId('view-form-dropdown')).toBeInTheDocument()
    const allButtons = screen.getAllByTestId('action-button')
    const resetBtn = allButtons[allButtons.length - 1]
    fireEvent.click(resetBtn)
    expect(mockContextDefaults.handleNewConversation).toHaveBeenCalled()
  })

  it('handles pin and unpin flows correctly', () => {
    const handlePinConversation = vi.fn()
    const handleUnpinConversation = vi.fn()
    const mockConv: ConversationItem = { id: 'conv-1', name: 'My Chat', inputs: null, introduction: '' }

    const { rerender } = setup({
      currentConversationId: 'conv-1',
      currentConversationItem: mockConv,
      handlePinConversation,
      pinnedConversationList: [],
    })
    fireEvent.click(screen.getByText('Pin'))
    expect(handlePinConversation).toHaveBeenCalledWith('conv-1')

    vi.mocked(useChatWithHistoryContext).mockReturnValue({
      ...mockContextDefaults,
      currentConversationId: 'conv-1',
      currentConversationItem: mockConv,
      handleUnpinConversation,
      pinnedConversationList: [{ id: 'conv-1' } as ConversationItem],
    } as ChatWithHistoryContextValue)
    rerender(<Header />)

    fireEvent.click(screen.getByText('Pin'))
    expect(handleUnpinConversation).toHaveBeenCalledWith('conv-1')
  })

  it('manages rename modal lifecycle correctly', () => {
    const handleRenameConversation = vi.fn()
    const mockConv: ConversationItem = { id: 'conv-1', name: 'My Chat', inputs: null, introduction: '' }
    setup({ currentConversationId: 'conv-1', currentConversationItem: mockConv, handleRenameConversation })

    fireEvent.click(screen.getByText('Rename'))
    expect(screen.getByTestId('rename-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel Rename'))
    expect(screen.queryByTestId('rename-modal')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Rename'))
    fireEvent.click(screen.getByText('Save Rename'))
    expect(handleRenameConversation).toHaveBeenCalledWith('conv-1', 'New Name', expect.any(Object))
  })

  it('manages delete confirmation lifecycle correctly', () => {
    const handleDeleteConversation = vi.fn()
    const mockConv: ConversationItem = { id: 'conv-1', name: 'My Chat', inputs: null, introduction: '' }
    setup({ currentConversationId: 'conv-1', currentConversationItem: mockConv, handleDeleteConversation })

    fireEvent.click(screen.getByText('Delete'))
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel Delete'))
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Delete'))
    fireEvent.click(screen.getByText('Confirm Delete'))
    expect(handleDeleteConversation).toHaveBeenCalledWith('conv-1', expect.any(Object))
  })

  it('applies proper styling when sidebar is not collapsed', () => {
    setup({ sidebarCollapseState: false })
    const sidebarBtn = screen.getAllByTestId('action-button')[0]
    expect(sidebarBtn).toHaveClass('cursor-default')
  })
})
