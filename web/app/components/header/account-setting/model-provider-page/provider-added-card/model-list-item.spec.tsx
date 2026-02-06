import type { ModelItem, ModelProvider } from '../declarations'
import { render, screen } from '@testing-library/react'
import ModelListItem from './model-list-item'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/context/app-context', () => ({
  useAppContext: () => ({
    isCurrentWorkspaceManager: true,
  }),
}))

vi.mock('@/context/provider-context', () => ({
  useProviderContext: () => ({
    plan: { type: 'pro' },
  }),
  useProviderContextSelector: () => false,
}))

vi.mock('@/service/common', () => ({
  enableModel: vi.fn(),
  disableModel: vi.fn(),
}))

vi.mock('../hooks', () => ({
  useUpdateModelList: () => vi.fn(),
}))

vi.mock('../model-icon', () => ({
  default: () => <div data-testid="model-icon" />,
}))

vi.mock('../model-name', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="model-name">{children}</div>,
}))

vi.mock('../model-auth', () => ({
  ConfigModel: () => <div data-testid="config-model" />,
}))

vi.mock('@/app/components/base/switch', () => ({
  default: ({ defaultValue, onChange, disabled }: { defaultValue?: boolean, onChange?: (checked: boolean) => void, disabled?: boolean }) => (
    <input
      data-testid="model-switch"
      type="checkbox"
      defaultChecked={defaultValue}
      disabled={disabled}
      onChange={e => onChange?.(e.target.checked)}
    />
  ),
}))

vi.mock('@/app/components/base/tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
}))

vi.mock('@/app/components/base/badge', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="badge">{children}</div>
  ),
}))

describe('ModelListItem', () => {
  const mockProvider = {
    provider: 'test-provider',
  } as unknown as ModelProvider

  const mockModel = {
    model: 'gpt-4',
    model_type: 'llm',
    fetch_from: 'system',
    status: 'active',
    deprecated: false,
    load_balancing_enabled: false,
    has_invalid_load_balancing_configs: false,
  } as unknown as ModelItem

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render model item with icon and name', () => {
    render(
      <ModelListItem
        model={mockModel}
        provider={mockProvider}
        isConfigurable={false}
      />,
    )
    expect(screen.getByTestId('model-icon')).toBeInTheDocument()
    expect(screen.getByTestId('model-name')).toBeInTheDocument()
  })

  it('should render model switch toggle', () => {
    render(
      <ModelListItem
        model={mockModel}
        provider={mockProvider}
        isConfigurable={false}
      />,
    )
    expect(screen.getByTestId('model-switch')).toBeInTheDocument()
  })

  it('should disable switch when model is deprecated', () => {
    const deprecatedModel = { ...mockModel, deprecated: true }
    render(
      <ModelListItem
        model={deprecatedModel}
        provider={mockProvider}
        isConfigurable={false}
      />,
    )
    expect(screen.getByTestId('model-switch')).toBeDisabled()
  })

  it('should render model list item with all key elements', () => {
    render(
      <ModelListItem
        model={mockModel}
        provider={mockProvider}
        isConfigurable={true}
      />,
    )
    expect(screen.getByTestId('model-icon')).toBeInTheDocument()
    expect(screen.getByTestId('model-name')).toBeInTheDocument()
    expect(screen.getByTestId('model-switch')).toBeInTheDocument()
  })
})
