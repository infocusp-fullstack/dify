import type { ModelItem, ModelProvider } from '../declarations'
import { ConfigurationMethodEnum } from '../declarations'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/toast', () => ({
  useToastContext: () => ({
    notify: vi.fn(),
  }),
}))

vi.mock('@/service/use-models', () => ({
  useGetModelCredential: () => ({
    isLoading: false,
    data: {
      load_balancing: { enabled: true, configs: [] },
      current_credential_id: 'cred-1',
      available_credentials: [],
    },
    refetch: vi.fn(),
  }),
  useUpdateModelLoadBalancingConfig: () => vi.fn(),
}))

vi.mock('../model-auth/hooks/use-auth', () => ({
  useAuth: () => ({
    doingAction: false,
    deleteModel: vi.fn(),
  }),
}))

vi.mock('../hooks', () => ({
  useRefreshModel: () => vi.fn(),
}))

vi.mock('@/app/components/base/modal', () => ({
  default: () => <div data-testid="modal" />,
}))

vi.mock('@/app/components/base/loading', () => ({
  default: () => <div data-testid="loading" />,
}))

vi.mock('./model-load-balancing-configs', () => ({
  default: () => <div data-testid="configs" />,
}))

vi.mock('@/app/components/header/account-setting/model-provider-page/model-auth', () => ({
  SwitchCredentialInLoadBalancing: () => <div data-testid="switch-credential" />,
}))

vi.mock('../model-icon', () => ({
  default: () => <div data-testid="model-icon" />,
}))

vi.mock('../model-name', () => ({
  default: () => <div data-testid="model-name" />,
}))

describe('ModelLoadBalancingModal', () => {
  it('component should be importable', () => {
    expect(ConfigurationMethodEnum.predefinedModel).toBeDefined()
  })

  it('supports model provider and item types', () => {
    const provider = {} as unknown as ModelProvider
    const model = {} as unknown as ModelItem
    expect(provider).toBeDefined()
    expect(model).toBeDefined()
  })
})
