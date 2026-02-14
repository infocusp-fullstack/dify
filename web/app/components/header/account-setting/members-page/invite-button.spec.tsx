import type { AppContextValue } from '@/context/app-context'
import type { ICurrentWorkspace } from '@/models/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { useAppContext } from '@/context/app-context'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { useWorkspacePermissions } from '@/service/use-workspace'
import InviteButton from './invite-button'

vi.mock('@/context/app-context')
vi.mock('@/context/global-public-context')
vi.mock('@/service/use-workspace')
vi.mock('@/app/components/base/loading', () => ({
  default: () => <div data-testid="loading-component" />,
}))

describe('InviteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAppContext).mockReturnValue({
      currentWorkspace: { id: 'workspace-id' } as ICurrentWorkspace,
    } as unknown as AppContextValue)
  })

  it('should render correctly when branding is disabled', () => {
    vi.mocked(useGlobalPublicStore).mockImplementation(selector => selector({
      systemFeatures: { branding: { enabled: false } },
    } as unknown as Parameters<typeof selector>[0]))

    vi.mocked(useWorkspacePermissions).mockReturnValue({
      data: null,
      isFetching: false,
    } as unknown as ReturnType<typeof useWorkspacePermissions>)

    render(<InviteButton />)

    expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument()
  })

  it('should show loading state when fetching permissions (branding enabled)', () => {
    vi.mocked(useGlobalPublicStore).mockImplementation(selector => selector({
      systemFeatures: { branding: { enabled: true } },
    } as unknown as Parameters<typeof selector>[0]))

    vi.mocked(useWorkspacePermissions).mockReturnValue({
      data: null,
      isFetching: true,
    } as unknown as ReturnType<typeof useWorkspacePermissions>)

    render(<InviteButton />)

    expect(screen.getByTestId('loading-component')).toBeInTheDocument()
  })

  it('should return null when permission is denied (branding enabled)', () => {
    vi.mocked(useGlobalPublicStore).mockImplementation(selector => selector({
      systemFeatures: { branding: { enabled: true } },
    } as unknown as Parameters<typeof selector>[0]))

    vi.mocked(useWorkspacePermissions).mockReturnValue({
      data: { allow_member_invite: false },
      isFetching: false,
    } as unknown as ReturnType<typeof useWorkspacePermissions>)

    render(<InviteButton />)

    expect(screen.queryByRole('button', { name: /invite/i })).not.toBeInTheDocument()
  })

  it('should render and handle click when permission is granted (branding enabled)', () => {
    vi.mocked(useGlobalPublicStore).mockImplementation(selector => selector({
      systemFeatures: { branding: { enabled: true } },
    } as unknown as Parameters<typeof selector>[0]))

    vi.mocked(useWorkspacePermissions).mockReturnValue({
      data: { allow_member_invite: true },
      isFetching: false,
    } as unknown as ReturnType<typeof useWorkspacePermissions>)

    const handleClick = vi.fn()
    render(<InviteButton onClick={handleClick} />)

    const btn = screen.getByRole('button', { name: /invite/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
