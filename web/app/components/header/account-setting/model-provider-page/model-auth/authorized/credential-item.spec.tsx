import type { Credential } from '../../declarations'
import { fireEvent, render, screen } from '@testing-library/react'
import CredentialItem from './credential-item'

vi.mock('@/app/components/header/indicator', () => ({
  default: () => <div data-testid="indicator" />,
}))

describe('CredentialItem', () => {
  const mockCredential: Credential = {
    credential_id: 'cred-1',
    credential_name: 'Test API Key',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render credential name', () => {
      render(<CredentialItem credential={mockCredential} />)

      expect(screen.getByText('Test API Key')).toBeInTheDocument()
      expect(screen.getByTestId('indicator')).toBeInTheDocument()
    })

    it('should display Enterprise badge for enterprise credentials', () => {
      const enterpriseCredential = { ...mockCredential, from_enterprise: true }

      render(<CredentialItem credential={enterpriseCredential} />)

      expect(screen.getByText('Enterprise')).toBeInTheDocument()
    })

    it('should not display Enterprise badge for non-enterprise credentials', () => {
      render(<CredentialItem credential={mockCredential} />)

      expect(screen.queryByText('Enterprise')).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should trigger onItemClick when clicked', () => {
      const onItemClick = vi.fn()

      render(
        <CredentialItem
          credential={mockCredential}
          onItemClick={onItemClick}
        />,
      )

      fireEvent.click(screen.getByText('Test API Key'))

      expect(onItemClick).toHaveBeenCalledWith(mockCredential)
    })

    it('should not trigger onItemClick when disabled', () => {
      const onItemClick = vi.fn()

      render(
        <CredentialItem
          credential={mockCredential}
          onItemClick={onItemClick}
          disabled
        />,
      )

      fireEvent.click(screen.getByText('Test API Key'))

      expect(onItemClick).not.toHaveBeenCalled()
    })

    it('should not trigger onItemClick when credential is not allowed to use', () => {
      const onItemClick = vi.fn()
      const notAllowedCredential = { ...mockCredential, not_allowed_to_use: true }

      render(
        <CredentialItem
          credential={notAllowedCredential}
          onItemClick={onItemClick}
        />,
      )

      fireEvent.click(screen.getByText('Test API Key'))

      expect(onItemClick).not.toHaveBeenCalled()
    })
  })
})
