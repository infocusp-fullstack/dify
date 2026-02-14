import type { AppContextValue } from '@/context/app-context'
import type { ICurrentWorkspace, Member } from '@/models/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { createMockProviderContextValue } from '@/__mocks__/provider-context'
import { useAppContext } from '@/context/app-context'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { useProviderContext } from '@/context/provider-context'
import { useFormatTimeFromNow } from '@/hooks/use-format-time-from-now'
import { useMembers } from '@/service/use-common'
import MembersPage from './index'

vi.mock('@/context/app-context')
vi.mock('@/context/global-public-context')
vi.mock('@/context/provider-context')
vi.mock('@/hooks/use-format-time-from-now')
vi.mock('@/service/use-common')
vi.mock('@remixicon/react', () => ({
  RiPencilLine: () => <div data-testid="ri-pencil-line" />,
}))

// Mock child components to simplify testing
vi.mock('./edit-workspace-modal', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => <div data-testid="edit-workspace-modal"><button onClick={onCancel}>Close</button></div>,
}))
vi.mock('./invite-button', () => ({
  default: ({ onClick, disabled }: { onClick: () => void, disabled: boolean }) => <button onClick={onClick} disabled={disabled}>Invite</button>,
}))
vi.mock('./invite-modal', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => <div data-testid="invite-modal"><button onClick={onCancel}>Close</button></div>,
}))
vi.mock('./invited-modal', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => <div data-testid="invited-modal"><button onClick={onCancel}>Close</button></div>,
}))
vi.mock('./operation', () => ({
  default: () => <div data-testid="operation-component">Operation</div>,
}))
vi.mock('./operation/transfer-ownership', () => ({
  default: ({ onOperate }: { onOperate: () => void }) => <button onClick={onOperate}>Transfer</button>,
}))
vi.mock('./transfer-ownership-modal', () => ({
  default: ({ onClose }: { onClose: () => void }) => <div data-testid="transfer-ownership-modal"><button onClick={onClose}>Close</button></div>,
}))

describe('MembersPage', () => {
  const mockRefetch = vi.fn()
  const mockFormatTimeFromNow = vi.fn(() => 'just now')

  const mockAccounts: Member[] = [
    {
      id: '1',
      name: 'Owner User',
      email: 'owner@example.com',
      avatar: '',
      avatar_url: '',
      role: 'owner',
      last_active_at: '2023-11-15T00:00:00Z',
      last_login_at: '2023-11-15T00:00:00Z',
      created_at: '2023-11-15T00:00:00Z',
      status: 'active',
    },
    {
      id: '2',
      name: 'Admin User',
      email: 'admin@example.com',
      avatar: '',
      avatar_url: '',
      role: 'admin',
      last_active_at: '2023-11-15T00:00:00Z',
      last_login_at: '2023-11-15T00:00:00Z',
      created_at: '2023-11-15T00:00:00Z',
      status: 'active',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAppContext).mockReturnValue({
      userProfile: { email: 'owner@example.com' },
      currentWorkspace: { name: 'Test Workspace', role: 'owner' } as ICurrentWorkspace,
      isCurrentWorkspaceOwner: true,
      isCurrentWorkspaceManager: true,
    } as unknown as AppContextValue)

    vi.mocked(useMembers).mockReturnValue({
      data: { accounts: mockAccounts },
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useMembers>)

    vi.mocked(useGlobalPublicStore).mockImplementation(selector => selector({
      systemFeatures: { is_email_setup: true },
    } as unknown as Parameters<typeof selector>[0]))

    vi.mocked(useProviderContext).mockReturnValue(createMockProviderContextValue({
      enableBilling: false,
      isAllowTransferWorkspace: true,
    }))
    vi.mocked(useFormatTimeFromNow).mockReturnValue({
      formatTimeFromNow: mockFormatTimeFromNow,
    })
  })

  it('should render workspace info and member list', () => {
    render(<MembersPage />)

    expect(screen.getByText('Test Workspace')).toBeInTheDocument()
    expect(screen.getByText('Owner User')).toBeInTheDocument()
    expect(screen.getByText('owner@example.com')).toBeInTheDocument()
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })

  it('should render pencil icon', () => {
    render(<MembersPage />)

    expect(screen.getByTestId('ri-pencil-line')).toBeInTheDocument()
  })

  it('should open/close EditWorkspaceModal', () => {
    render(<MembersPage />)

    const editIcon = screen.getByTestId('ri-pencil-line')
    const editBtn = editIcon.parentElement
    fireEvent.click(editBtn!)

    expect(screen.getByTestId('edit-workspace-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Close'))
    expect(screen.queryByTestId('edit-workspace-modal')).not.toBeInTheDocument()
  })

  it('should open/close InviteModal', () => {
    render(<MembersPage />)

    const inviteBtn = screen.getByRole('button', { name: /invite/i })
    fireEvent.click(inviteBtn)

    expect(screen.getByTestId('invite-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Close'))
    expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument()
  })

  it('should show TransferOwnership component for owner', () => {
    render(<MembersPage />)

    expect(screen.getByText('Transfer')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Transfer'))
    expect(screen.getByTestId('transfer-ownership-modal')).toBeInTheDocument()
  })

  it('should show Operation component for other members when current user is owner', () => {
    render(<MembersPage />)

    expect(screen.getByTestId('operation-component')).toBeInTheDocument()
  })

  it('should hide edit/invite options if not owner/manager', () => {
    vi.mocked(useAppContext).mockReturnValue({
      userProfile: { email: 'admin@example.com' },
      currentWorkspace: { name: 'Test Workspace', role: 'admin' } as ICurrentWorkspace,
      isCurrentWorkspaceOwner: false,
      isCurrentWorkspaceManager: false,
    } as unknown as AppContextValue)

    render(<MembersPage />)

    expect(screen.queryByTestId('ri-pencil-line')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /invite/i })).toBeDisabled()
  })
})
