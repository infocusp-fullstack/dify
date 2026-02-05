import type { ModelProvider } from '../declarations'
import { render, screen } from '@testing-library/react'
import QuotaPanel from './quota-panel'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { modelNames?: string }) => `${_key}${options?.modelNames ? `:${options.modelNames}` : ''}`,
  }),
}))

vi.mock('@/context/app-context', () => ({
  useAppContext: () => ({
    currentWorkspace: {
      trial_credits: 100,
      trial_credits_used: 30,
      next_credit_reset_date: '2024-12-31',
    },
  }),
}))

vi.mock('@/context/global-public-context', () => ({
  useGlobalPublicStore: (selector: (state: unknown) => unknown) => selector({
    systemFeatures: {
      trial_models: [],
    },
  }),
}))

vi.mock('../hooks', () => ({
  useMarketplaceAllPlugins: () => ({
    plugins: [],
  }),
}))

vi.mock('@/hooks/use-timestamp', () => ({
  default: () => ({
    formatTime: (_date: string, _format: string) => '2024-12-31',
  }),
}))

vi.mock('@/app/components/base/loading', () => ({
  default: () => <div data-testid="loading">Loading...</div>,
}))

vi.mock('@/app/components/base/tooltip', () => ({
  default: ({ children, popupContent }: { children: React.ReactNode, popupContent: string }) => (
    <div data-testid="tooltip" title={popupContent}>{children}</div>
  ),
}))

vi.mock('@/app/components/plugins/install-plugin/install-from-marketplace', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="install-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

vi.mock('@/app/components/base/icons/src/public/llm', () => ({
  OpenaiSmall: () => <div data-testid="openai-icon" />,
  AnthropicShortLight: () => <div data-testid="anthropic-icon" />,
  Gemini: () => <div data-testid="gemini-icon" />,
  Grok: () => <div data-testid="grok-icon" />,
  Deepseek: () => <div data-testid="deepseek-icon" />,
  Tongyi: () => <div data-testid="tongyi-icon" />,
}))

describe('QuotaPanel', () => {
  const mockProviders = [
    {
      provider: 'langgenius/openai/openai',
      preferred_provider_type: 'custom',
      custom_configuration: { available_credentials: [{ id: '1' }] },
    },
  ] as unknown as ModelProvider[]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state when isLoading is true', () => {
    render(
      <QuotaPanel
        providers={mockProviders}
        isLoading={true}
      />,
    )
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('should display quota credits when not loading', () => {
    render(
      <QuotaPanel
        providers={mockProviders}
        isLoading={false}
      />,
    )
    expect(screen.getByText(/modelProvider.quota/)).toBeInTheDocument()
    expect(screen.getByText(/70/)).toBeInTheDocument()
  })
})
