import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { CredentialTypeEnum } from '@/app/components/plugins/plugin-auth/types'
import Operator from './operator'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/dropdown', () => ({
  default: ({ items, secondItems, onSelect }: {
    items: { value: string }[]
    secondItems: { value: string }[]
    onSelect: (item: { value: string }) => void
  }) => (
    <div data-testid="dropdown">
      {items.map(item => (
        <button
          key={item.value}
          data-testid={`item-${item.value}`}
          onClick={() => onSelect(item)}
        >
          {item.value}
        </button>
      ))}
      {secondItems.map(item => (
        <button
          key={item.value}
          data-testid={`item-${item.value}`}
          onClick={() => onSelect(item)}
        >
          {item.value}
        </button>
      ))}
    </div>
  ),
  Item: {},
}))

describe('Operator Component', () => {
  const mockOnAction = vi.fn()
  const mockOnRename = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render items for OAUTH2 type', () => {
    const mockCredential = {
      id: '1',
      type: CredentialTypeEnum.OAUTH2,
      name: 'Test',
      credential: {},
      is_default: false,
      avatar_url: '',
    }

    render(
      <Operator
        credentialItem={mockCredential}
        onAction={mockOnAction}
        onRename={mockOnRename}
      />,
    )

    expect(screen.getByTestId('item-setDefault')).toBeInTheDocument()
    expect(screen.getByTestId('item-rename')).toBeInTheDocument()
    expect(screen.getByTestId('item-change')).toBeInTheDocument()
    expect(screen.getByTestId('item-delete')).toBeInTheDocument()
    // Should not have edit
    expect(screen.queryByTestId('item-edit')).not.toBeInTheDocument()
  })

  it('should render items for API_KEY type', () => {
    const mockCredential = {
      id: '2',
      type: CredentialTypeEnum.API_KEY,
      name: 'Test',
      credential: {},
      is_default: false,
      avatar_url: '',
    }

    render(
      <Operator
        credentialItem={mockCredential}
        onAction={mockOnAction}
        onRename={mockOnRename}
      />,
    )

    expect(screen.getByTestId('item-setDefault')).toBeInTheDocument()
    expect(screen.getByTestId('item-edit')).toBeInTheDocument()
    expect(screen.getByTestId('item-delete')).toBeInTheDocument()
    // Should not have rename or change
    expect(screen.queryByTestId('item-rename')).not.toBeInTheDocument()
    expect(screen.queryByTestId('item-change')).not.toBeInTheDocument()
  })

  it('should call onRename when rename is selected', () => {
    const mockCredential = {
      id: '1',
      type: CredentialTypeEnum.OAUTH2,
      name: 'Test',
      credential: {},
      is_default: false,
      avatar_url: '',
    }

    render(
      <Operator
        credentialItem={mockCredential}
        onAction={mockOnAction}
        onRename={mockOnRename}
      />,
    )

    fireEvent.click(screen.getByTestId('item-rename'))
    expect(mockOnRename).toHaveBeenCalled()
    expect(mockOnAction).not.toHaveBeenCalled()
  })

  it('should call onAction when other items are selected', () => {
    const mockCredential = {
      id: '1',
      type: CredentialTypeEnum.OAUTH2,
      name: 'Test',
      credential: {},
      is_default: false,
      avatar_url: '',
    }

    render(
      <Operator
        credentialItem={mockCredential}
        onAction={mockOnAction}
        onRename={mockOnRename}
      />,
    )

    fireEvent.click(screen.getByTestId('item-setDefault'))
    expect(mockOnAction).toHaveBeenCalledWith('setDefault', mockCredential)
    expect(mockOnRename).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('item-delete'))
    expect(mockOnAction).toHaveBeenCalledWith('delete', mockCredential)
  })
})
