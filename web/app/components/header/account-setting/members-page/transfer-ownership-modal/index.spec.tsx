import type { AppContextValue } from '@/context/app-context'
import type { ICurrentWorkspace } from '@/models/common'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useAppContext } from '@/context/app-context'
import { ownershipTransfer, sendOwnerEmail, verifyOwnerEmail } from '@/service/common'
import TransferOwnershipModal from './index'

vi.mock('@/context/app-context')
vi.mock('@/service/common')

const mockNotify = vi.fn()
vi.mock('use-context-selector', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useContext: vi.fn(() => ({ notify: mockNotify })),
  }
})

vi.mock('./member-selector', () => ({
  default: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button onClick={() => onSelect('new-owner-id')}>Select Member</button>
  ),
}))

describe('TransferOwnershipModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAppContext).mockReturnValue({
      currentWorkspace: { name: 'Test Workspace' } as ICurrentWorkspace,
      userProfile: { email: 'owner@example.com', id: 'owner-id' },
    } as unknown as AppContextValue)
  })

  it('should handle full transfer flow', async () => {
    vi.mocked(sendOwnerEmail).mockResolvedValue({ data: 'step-token', result: 'success' } as unknown as Awaited<ReturnType<typeof sendOwnerEmail>>)
    vi.mocked(verifyOwnerEmail).mockResolvedValue({ is_valid: true, token: 'final-token', result: 'success' } as unknown as Awaited<ReturnType<typeof verifyOwnerEmail>>)
    vi.mocked(ownershipTransfer).mockResolvedValue({ result: 'success' } as unknown as Awaited<ReturnType<typeof ownershipTransfer>>)

    const mockReload = vi.fn()
    vi.stubGlobal('location', {
      ...window.location,
      reload: mockReload,
    })

    render(<TransferOwnershipModal show={true} onClose={mockOnClose} />)

    // Step 1: Start - use flexible regex for keys
    fireEvent.click(screen.getByText(/members\.transferModal\.sendVerifyCode/i))

    await waitFor(() => {
      expect(sendOwnerEmail).toHaveBeenCalled()
    })

    // Step 2: Verify
    const input = screen.getByPlaceholderText(/members\.transferModal\.codePlaceholder/i)
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(screen.getByText(/members\.transferModal\.continue/i))

    await waitFor(() => {
      expect(verifyOwnerEmail).toHaveBeenCalledWith({ code: '123456', token: 'step-token' })
    })

    // Step 3: Transfer
    fireEvent.click(screen.getByText(/select member/i))
    fireEvent.click(screen.getByText(/members\.transferModal\.transfer$/i))

    await waitFor(() => {
      expect(ownershipTransfer).toHaveBeenCalledWith('new-owner-id', { token: 'final-token' })
      expect(mockReload).toHaveBeenCalled()
    })

    vi.unstubAllGlobals()
  })
})
