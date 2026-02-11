import type { AppContextValue } from '@/context/app-context'
import type { ICurrentWorkspace } from '@/models/common'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useAppContext } from '@/context/app-context'
import { updateWorkspaceInfo } from '@/service/common'
import EditWorkspaceModal from './index'

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

describe('EditWorkspaceModal', () => {
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAppContext).mockReturnValue({
      currentWorkspace: { name: 'Test Workspace' } as ICurrentWorkspace,
      isCurrentWorkspaceOwner: true,
    } as unknown as AppContextValue)
  })

  it('should render with initial workspace name', () => {
    render(<EditWorkspaceModal onCancel={mockOnCancel} />)
    expect(screen.getByDisplayValue('Test Workspace')).toBeInTheDocument()
  })

  it('should update name on input change', async () => {
    render(<EditWorkspaceModal onCancel={mockOnCancel} />)
    const input = screen.getByPlaceholderText(/account\.workspaceNamePlaceholder/i)
    await act(async () => {
      fireEvent.change(input, { target: { value: 'New Name' } })
    })
    expect(input).toHaveValue('New Name')
  })

  it('should call updateWorkspaceInfo and onCancel on confirm', async () => {
    vi.mocked(updateWorkspaceInfo).mockResolvedValue({} as ICurrentWorkspace)

    render(<EditWorkspaceModal onCancel={mockOnCancel} />)
    const input = screen.getByPlaceholderText(/account\.workspaceNamePlaceholder/i)
    await act(async () => {
      fireEvent.change(input, { target: { value: 'New Name' } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText(/operation\.confirm/i))
    })

    await waitFor(() => {
      expect(updateWorkspaceInfo).toHaveBeenCalledWith({
        url: '/workspaces/info',
        body: { name: 'New Name' },
      })
      expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }))
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  it('should show error notify if updateWorkspaceInfo fails', async () => {
    vi.mocked(updateWorkspaceInfo).mockRejectedValue(new Error('Failed'))

    render(<EditWorkspaceModal onCancel={mockOnCancel} />)

    await act(async () => {
      fireEvent.click(screen.getByText(/operation\.confirm/i))
    })

    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }))
    })
  })

  it('should be disabled if not owner', () => {
    vi.mocked(useAppContext).mockReturnValue({
      currentWorkspace: { name: 'Test Workspace' } as ICurrentWorkspace,
      isCurrentWorkspaceOwner: false,
    } as unknown as AppContextValue)

    render(<EditWorkspaceModal onCancel={mockOnCancel} />)
    expect(screen.getByText(/operation\.confirm/i)).toBeDisabled()
  })
})
