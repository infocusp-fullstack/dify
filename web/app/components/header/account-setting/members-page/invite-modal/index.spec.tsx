import type { InvitationResponse } from '@/models/common'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useProviderContextSelector } from '@/context/provider-context'
import { inviteMember } from '@/service/common'
import InviteModal from './index'

vi.mock('@/context/provider-context')
vi.mock('@/service/common')
const mockNotify = vi.fn()
vi.mock('use-context-selector', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useContext: vi.fn(() => ({ notify: mockNotify })),
  }
})
vi.mock('@/context/i18n', () => ({
  useLocale: () => 'en-US',
}))

// Mock RoleSelector to avoid complexity
vi.mock('./role-selector', () => ({
  default: ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <select data-testid="role-selector" value={value} onChange={e => onChange(e.target.value)}>
      <option value="normal">Normal</option>
      <option value="admin">Admin</option>
    </select>
  ),
}))

// Mock ReactMultiEmail
vi.mock('react-multi-email', () => ({
  ReactMultiEmail: ({ emails, onChange }: { emails: string[], onChange: (v: string[]) => void }) => (
    <div>
      <input
        data-testid="multi-email-input"
        value={emails.join(',')}
        onChange={e => onChange(e.target.value.split(',').filter(Boolean))}
      />
      {emails.map((email: string, index: number) => (
        <button
          key={email}
          data-testid={`remove-${email}`}
          onClick={() => {
            const next = [...emails]
            next.splice(index, 1)
            onChange(next)
          }}
        >
          Remove
        </button>
      ))}
    </div>
  ),
}))

describe('InviteModal', () => {
  const mockOnCancel = vi.fn()
  const mockOnSend = vi.fn()
  const mockRefreshLicenseLimit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useProviderContextSelector).mockImplementation(selector => selector({
      licenseLimit: { workspace_members: { size: 5, limit: 10 } },
      refreshLicenseLimit: mockRefreshLicenseLimit,
    } as unknown as Parameters<typeof selector>[0]))
  })

  it('should render correctly', async () => {
    await act(async () => {
      render(<InviteModal isEmailSetup={true} onCancel={mockOnCancel} onSend={mockOnSend} />)
    })
    expect(screen.getByText(/members\.inviteTeamMember$/i)).toBeInTheDocument()
    expect(screen.getByTestId('multi-email-input')).toBeInTheDocument()
  })

  it('should show warning if email is not setup', async () => {
    await act(async () => {
      render(<InviteModal isEmailSetup={false} onCancel={mockOnCancel} onSend={mockOnSend} />)
    })
    expect(screen.getByText(/members\.emailNotSetup$/i)).toBeInTheDocument()
  })

  it('should add and remove emails', async () => {
    render(<InviteModal isEmailSetup={true} onCancel={mockOnCancel} onSend={mockOnSend} />)
    const input = screen.getByTestId('multi-email-input')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test@example.com' } })
    })
    expect(screen.getByTestId('remove-test@example.com')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByTestId('remove-test@example.com'))
    })
    expect(screen.queryByTestId('remove-test@example.com')).not.toBeInTheDocument()
  })

  it('should send invites when clicking send button', async () => {
    vi.mocked(inviteMember).mockResolvedValue({ result: 'success', invitation_results: [] } as InvitationResponse)

    render(<InviteModal isEmailSetup={true} onCancel={mockOnCancel} onSend={mockOnSend} />)

    const input = screen.getByTestId('multi-email-input')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'test@example.com' } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText(/members\.sendInvite/i))
    })

    await waitFor(() => {
      expect(inviteMember).toHaveBeenCalled()
      expect(mockRefreshLicenseLimit).toHaveBeenCalled()
      expect(mockOnSend).toHaveBeenCalled()
    })
  })

  it('should handle send invite error', async () => {
    vi.mocked(inviteMember).mockRejectedValue(new Error('Failed'))

    render(<InviteModal isEmailSetup={true} onCancel={mockOnCancel} onSend={mockOnSend} />)

    const input = screen.getByTestId('multi-email-input')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'test@example.com' } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText(/members\.sendInvite/i))
    })

    await waitFor(() => {
      expect(inviteMember).toHaveBeenCalled()
      // Should not call onSend if failed
      expect(mockOnSend).not.toHaveBeenCalled()
    })
  })

  it('should disable button if limit exceeded', async () => {
    vi.mocked(useProviderContextSelector).mockImplementation(selector => selector({
      licenseLimit: { workspace_members: { size: 10, limit: 10 } },
      refreshLicenseLimit: vi.fn(),
    } as unknown as Parameters<typeof selector>[0]))

    await act(async () => {
      render(<InviteModal isEmailSetup={true} onCancel={mockOnCancel} onSend={mockOnSend} />)
    })

    const input = screen.getByTestId('multi-email-input')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'extra@example.com' } })
    })

    expect(screen.getByText(/members\.sendInvite/i)).toBeDisabled()
  })
})
