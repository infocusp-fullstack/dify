import { fireEvent, render, screen } from '@testing-library/react'
import copy from 'copy-to-clipboard'
import { vi } from 'vitest'
import InvitationLink from './invitation-link'

vi.mock('copy-to-clipboard')
vi.mock('i18next', () => ({
  t: (key: string) => key,
}))

describe('InvitationLink', () => {
  const value = { email: 'test@example.com', status: 'success' as const, url: '/invite/123' }

  it('should copy link on click', () => {
    render(<InvitationLink value={value} />)

    const linkDiv = screen.getByText('/invite/123')
    fireEvent.click(linkDiv)

    expect(copy).toHaveBeenCalled()
  })
})
