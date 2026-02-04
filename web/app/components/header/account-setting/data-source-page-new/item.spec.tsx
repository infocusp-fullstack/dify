import type { DataSourceCredential } from './types'
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { vi } from 'vitest'
import { CredentialTypeEnum } from '@/app/components/plugins/plugin-auth/types'
import Item from './item'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('./operator', () => ({
  default: ({ onRename, onAction, credentialItem }: { onRename: () => void, onAction: (a: string, c: DataSourceCredential) => void, credentialItem: DataSourceCredential }) => (
    <div data-testid="operator">
      <button onClick={onRename}>Rename</button>
      <button onClick={() => onAction('delete', credentialItem)}>Delete</button>
    </div>
  ),
}))

vi.mock('@/app/components/base/button', () => ({
  default: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}))

vi.mock('@/app/components/base/input', () => ({
  default: ({ value, onChange, placeholder, onClick }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, onClick?: (e: React.MouseEvent<HTMLInputElement>) => void }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onClick={onClick}
      data-testid="rename-input"
    />
  ),
}))

vi.mock('@/app/components/header/indicator', () => ({
  default: () => <div data-testid="indicator" />,
}))

describe('Item Component', () => {
  const mockCredential: DataSourceCredential = {
    id: 'cred-1',
    name: 'Credential 1',
    type: CredentialTypeEnum.API_KEY,
    credential: {},
    is_default: false,
    avatar_url: '',
  }

  const mockOnAction = vi.fn<(action: string, credentialItem: DataSourceCredential, renamePayload?: Record<string, unknown>) => void>()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render credential name', () => {
    render(<Item credentialItem={mockCredential} onAction={mockOnAction} />)
    expect(screen.getByText('Credential 1')).toBeInTheDocument()
    expect(screen.getByText('connected')).toBeInTheDocument()
    expect(screen.getByTestId('indicator')).toBeInTheDocument()
    expect(screen.getByTestId('operator')).toBeInTheDocument()
  })

  it('should switch to rename mode when onRename is triggered', () => {
    render(<Item credentialItem={mockCredential} onAction={mockOnAction} />)

    // Initially not in rename mode
    expect(screen.queryByTestId('rename-input')).not.toBeInTheDocument()

    // Trigger rename via mocked Operator
    fireEvent.click(screen.getByText('Rename'))

    // Should now be in rename mode
    expect(screen.getByTestId('rename-input')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Credential 1')).toBeInTheDocument()
    expect(screen.getByText('operation.save')).toBeInTheDocument()
    expect(screen.getByText('operation.cancel')).toBeInTheDocument()
  })

  it('should handle rename save', () => {
    render(<Item credentialItem={mockCredential} onAction={mockOnAction} />)

    // Enter rename mode
    fireEvent.click(screen.getByText('Rename'))

    const input = screen.getByTestId('rename-input')
    fireEvent.click(input) // For coverage of stopPropagation
    fireEvent.change(input, { target: { value: 'New Name' } })

    fireEvent.click(screen.getByText('operation.save'))

    expect(mockOnAction).toHaveBeenCalledWith(
      'rename',
      mockCredential,
      {
        credential_id: 'cred-1',
        name: 'New Name',
      },
    )
    // Should exit rename mode
    expect(screen.queryByTestId('rename-input')).not.toBeInTheDocument()
  })

  it('should handle rename cancel', () => {
    render(<Item credentialItem={mockCredential} onAction={mockOnAction} />)

    // Enter rename mode
    fireEvent.click(screen.getByText('Rename'))

    const input = screen.getByTestId('rename-input')
    fireEvent.change(input, { target: { value: 'New Name' } })

    fireEvent.click(screen.getByText('operation.cancel'))

    expect(mockOnAction).not.toHaveBeenCalled()
    // Should exit rename mode and revert to display mode
    expect(screen.queryByTestId('rename-input')).not.toBeInTheDocument()
    expect(screen.getByText('Credential 1')).toBeInTheDocument()
  })
})
