import type { InvitationResult } from '@/models/common'
import { act, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import InvitedModal from './index'

vi.mock('@/config', () => ({
  IS_CE_EDITION: true,
}))

vi.mock('./invitation-link', () => ({
  default: ({ value }: { value: InvitationResult }) => <div data-testid="invitation-link">{'url' in value ? value.url : ''}</div>,
}))

describe('InvitedModal', () => {
  const mockOnCancel = vi.fn()
  const results: InvitationResult[] = [
    { email: 'success@example.com', status: 'success', url: 'http://invite.com/1' },
    { email: 'failed@example.com', status: 'failed', message: 'Error msg' },
  ]

  it('should render success and failed results', async () => {
    await act(async () => {
      render(<InvitedModal invitationResults={results} onCancel={mockOnCancel} />)
    })

    // The mock output includes the namespace prefix 'common.'
    expect(screen.getByText(/members\.invitationSent$/i)).toBeInTheDocument()
    expect(screen.getByTestId('invitation-link')).toHaveTextContent('http://invite.com/1')
    expect(screen.getByText('failed@example.com')).toBeInTheDocument()
  })
})
