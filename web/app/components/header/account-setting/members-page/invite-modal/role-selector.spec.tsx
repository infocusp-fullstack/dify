import type { ProviderContextState } from '@/context/provider-context'
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { useProviderContext } from '@/context/provider-context'
import RoleSelector from './role-selector'

vi.mock('@/context/provider-context')

describe('RoleSelector', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useProviderContext).mockReturnValue({
      datasetOperatorEnabled: true,
    } as unknown as ProviderContextState)
  })

  it('should render current role', () => {
    render(<RoleSelector value="admin" onChange={mockOnChange} />)
    // Match the interpolated key result from the i18n mock
    expect(screen.getByText(/members\.invitedAsRole/i)).toBeInTheDocument()
  })

  it('should open dropdown on click and show roles', () => {
    render(<RoleSelector value="normal" onChange={mockOnChange} />)
    fireEvent.click(screen.getByText(/members\.invitedAsRole/i))

    // Use exact match to avoid matching both 'admin' and 'adminTip'
    expect(screen.getByText('common.members.admin')).toBeInTheDocument()
    expect(screen.getByText('common.members.editor')).toBeInTheDocument()
  })

  it('should call onChange and close on role selection', () => {
    render(<RoleSelector value="normal" onChange={mockOnChange} />)
    fireEvent.click(screen.getByText(/members\.invitedAsRole/i))
    fireEvent.click(screen.getByText('common.members.admin'))

    expect(mockOnChange).toHaveBeenCalledWith('admin')
    expect(screen.queryByText('common.members.editor')).not.toBeInTheDocument()
  })
})
