import type { AppContextValue } from '@/context/app-context'
import type { ICurrentWorkspace } from '@/models/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { useAppContext } from '@/context/app-context'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { useWorkspacePermissions } from '@/service/use-workspace'
import TransferOwnership from './transfer-ownership'

vi.mock('@/context/app-context')
vi.mock('@/context/global-public-context')
vi.mock('@/service/use-workspace')
vi.mock('@/app/components/base/loading', () => ({
  default: () => <div data-testid="loading-component" />,
}))

describe('TransferOwnership', () => {
  const mockOnOperate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppContext).mockReturnValue({
      currentWorkspace: { id: 'workspace-id' } as ICurrentWorkspace,
    } as unknown as AppContextValue)
  })

  it('should render loading state when fetching permissions (branding enabled)', () => {
    vi.mocked(useGlobalPublicStore).mockImplementation(selector => selector({
      systemFeatures: { branding: { enabled: true } },
    } as unknown as Parameters<typeof selector>[0]))

    vi.mocked(useWorkspacePermissions).mockReturnValue({
      data: null,
      isFetching: true,
    } as unknown as ReturnType<typeof useWorkspacePermissions>)

    render(<TransferOwnership onOperate={mockOnOperate} />)
    expect(screen.getByTestId('loading-component')).toBeInTheDocument()
  })

  it('should render static text when transfer is not allowed (branding enabled)', () => {
    vi.mocked(useGlobalPublicStore).mockImplementation(selector => selector({
      systemFeatures: { branding: { enabled: true } },
    } as unknown as Parameters<typeof selector>[0]))

    vi.mocked(useWorkspacePermissions).mockReturnValue({
      data: { allow_owner_transfer: false },
      isFetching: false,
    } as unknown as ReturnType<typeof useWorkspacePermissions>)

    render(<TransferOwnership onOperate={mockOnOperate} />)
    expect(screen.getByText(/members\.owner/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should render menu and handle operation when transfer is allowed (branding enabled)', () => {
    vi.mocked(useGlobalPublicStore).mockImplementation(selector => selector({
      systemFeatures: { branding: { enabled: true } },
    } as unknown as Parameters<typeof selector>[0]))

    vi.mocked(useWorkspacePermissions).mockReturnValue({
      data: { allow_owner_transfer: true },
      isFetching: false,
    } as unknown as ReturnType<typeof useWorkspacePermissions>)

    render(<TransferOwnership onOperate={mockOnOperate} />)

    const menuButton = screen.getByRole('button', { name: /members\.owner/i })
    expect(menuButton).toBeInTheDocument()

    fireEvent.click(menuButton)

    const menuItem = screen.getByText(/members\.transferOwnership/i)
    expect(menuItem).toBeInTheDocument()

    fireEvent.click(menuItem)
    expect(mockOnOperate).toHaveBeenCalledTimes(1)
  })

  it('should render menu and handle operation when branding is disabled', () => {
    vi.mocked(useGlobalPublicStore).mockImplementation(selector => selector({
      systemFeatures: { branding: { enabled: false } },
    } as unknown as Parameters<typeof selector>[0]))

    vi.mocked(useWorkspacePermissions).mockReturnValue({
      data: null,
      isFetching: false,
    } as unknown as ReturnType<typeof useWorkspacePermissions>)

    render(<TransferOwnership onOperate={mockOnOperate} />)

    const menuButton = screen.getByRole('button', { name: /members\.owner/i })
    expect(menuButton).toBeInTheDocument()

    fireEvent.click(menuButton)
    expect(screen.getByText(/members\.transferOwnership/i)).toBeInTheDocument()
  })
})
