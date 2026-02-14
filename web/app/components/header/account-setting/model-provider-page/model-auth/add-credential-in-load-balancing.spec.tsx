import type { CustomModel, ModelCredential, ModelProvider } from '@/app/components/header/account-setting/model-provider-page/declarations'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConfigurationMethodEnum, ModelTypeEnum } from '@/app/components/header/account-setting/model-provider-page/declarations'
import AddCredentialInLoadBalancing from './add-credential-in-load-balancing'

// Mock icons to avoid SVG structure assertions but allow real icons for subcomponents
vi.mock('@remixicon/react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    RiAddLine: () => <div data-testid="add-icon" />,
  }
})

// Mock useAuth hook used by Authorized
const mockHandleOpenModal = vi.fn()
vi.mock('./hooks', () => ({
  useAuth: () => ({
    openConfirmDelete: vi.fn(),
    closeConfirmDelete: vi.fn(),
    doingAction: false,
    handleActiveCredential: vi.fn(),
    handleConfirmDelete: vi.fn(),
    deleteCredentialId: null,
    handleOpenModal: mockHandleOpenModal,
  }),
}))

// Mock portal components to avoid async issues and focus on logic
vi.mock('@/app/components/base/portal-to-follow-elem', () => ({
  PortalToFollowElem: ({ children, open }: { children: React.ReactNode, open: boolean }) => <div data-testid="portal" data-open={open}>{children}</div>,
  PortalToFollowElemTrigger: ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => (
    <div data-testid="portal-trigger" onClick={onClick}>{children}</div>
  ),
  PortalToFollowElemContent: ({ children }: { children: React.ReactNode, open?: boolean }) => {
    return <div data-testid="portal-content" style={{ display: 'block' }}>{children}</div>
  },
}))

describe('AddCredentialInLoadBalancing', () => {
  const mockProvider = {
    provider: 'openai',
    allow_custom_token: true,
  } as unknown as ModelProvider

  const mockModel = {
    model: 'gpt-4',
    model_type: ModelTypeEnum.textGeneration,
  } as unknown as CustomModel

  const mockModelCredential = {
    available_credentials: [
      { credential_id: 'cred-1', credential_name: 'Key 1' },
    ],
    credentials: {},
    load_balancing: { enabled: false, configs: [] },
  } as unknown as ModelCredential

  const mockOnSelectCredential = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the add credential button', () => {
    render(
      <AddCredentialInLoadBalancing
        provider={mockProvider}
        model={mockModel}
        configurationMethod={ConfigurationMethodEnum.predefinedModel}
        modelCredential={mockModelCredential}
        onSelectCredential={mockOnSelectCredential}
      />,
    )

    expect(screen.getByText(/modelProvider.auth.addCredential/)).toBeInTheDocument()
    expect(screen.getByTestId('add-icon')).toBeInTheDocument()
  })

  it('should call handleOpenModal when clicking trigger and no available credentials', () => {
    render(
      <AddCredentialInLoadBalancing
        provider={mockProvider}
        model={mockModel}
        configurationMethod={ConfigurationMethodEnum.predefinedModel}
        modelCredential={{ available_credentials: [] } as unknown as ModelCredential}
        onSelectCredential={mockOnSelectCredential}
      />,
    )

    fireEvent.click(screen.getByTestId('portal-trigger'))
    expect(mockHandleOpenModal).toHaveBeenCalled()
  })
})
