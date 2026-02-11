import type { Member } from '@/models/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { useMembers } from '@/service/use-common'
import MemberSelector from './member-selector'

vi.mock('@/service/use-common')

describe('MemberSelector', () => {
  const mockOnSelect = vi.fn()
  const mockMembers = [
    { id: '1', name: 'User 1', email: 'user1@example.com', role: 'admin' },
    { id: '2', name: 'User 2', email: 'user2@example.com', role: 'normal' },
  ] as Member[]

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useMembers).mockReturnValue({
      data: { accounts: mockMembers },
    } as unknown as ReturnType<typeof useMembers>)
  })

  it('should render member list and search', () => {
    render(<MemberSelector onSelect={mockOnSelect} />)

    // Click to open dropdown
    fireEvent.click(screen.getByText(/members\.transferModal\.transferPlaceholder/i))

    expect(screen.getByPlaceholderText(/common\.operation\.search/i)).toBeInTheDocument()
    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
  })

  it('should call onSelect when member is clicked', () => {
    render(<MemberSelector onSelect={mockOnSelect} />)

    // Click to open dropdown
    fireEvent.click(screen.getByText(/members\.transferModal\.transferPlaceholder/i))

    fireEvent.click(screen.getByText('User 1'))
    expect(mockOnSelect).toHaveBeenCalledWith('1')
  })

  it('should filter members on search', () => {
    render(<MemberSelector onSelect={mockOnSelect} />)

    // Click to open dropdown
    fireEvent.click(screen.getByText(/members\.transferModal\.transferPlaceholder/i))

    const searchInput = screen.getByPlaceholderText(/common\.operation\.search/i)
    fireEvent.change(searchInput, { target: { value: 'User 2' } })

    expect(screen.queryByText('User 1')).not.toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
  })
})
