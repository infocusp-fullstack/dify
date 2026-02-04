import type { AppContextValue } from '@/context/app-context'
import type { DataSourceNotion as IDataSourceNotion } from '@/models/common'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Toast from '@/app/components/base/toast'
import { useAppContext } from '@/context/app-context'
import { useDataSourceIntegrates, useNotionConnection } from '@/service/use-common'
import DataSourceNotion from './index'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/context/app-context', () => ({
  useAppContext: vi.fn(),
}))

vi.mock('@/service/use-common', () => ({
  useDataSourceIntegrates: vi.fn(),
  useNotionConnection: vi.fn(),
}))

vi.mock('../panel', () => ({
  // Mock Panel to verify props passed and ensure child components are rendered for coverage
  default: ({ isConfigured, onConfigure, configuredList, notionActions }: {
    isConfigured: boolean
    onConfigure: () => void
    configuredList: Array<{
      id: string
      name: string
      logo: (props: { className: string }) => React.ReactNode
      isActive: boolean
      notionConfig: { total: number }
    }>
    notionActions?: { onChangeAuthorizedPage?: () => void }
  }) => (
    <div data-testid="panel">
      <div data-testid="is-configured">{isConfigured ? 'true' : 'false'}</div>
      <button onClick={onConfigure} data-testid="configure-btn">Configure</button>
      {notionActions?.onChangeAuthorizedPage && (
        <button onClick={notionActions.onChangeAuthorizedPage} data-testid="auth-again-btn">
          Auth Again
        </button>
      )}
      <ul>
        {configuredList.map(item => (
          <li key={item.id} data-testid={`workspace-${item.id}`}>
            {item.name}
            {item.logo && (
              <div data-testid={`logo-${item.id}`}>
                {item.logo({ className: 'test-icon' })}
              </div>
            )}
            <span data-testid={`active-${item.id}`}>{item.isActive ? 'active' : 'inactive'}</span>
            <span data-testid={`total-${item.id}`}>{item.notionConfig.total}</span>
          </li>
        ))}
      </ul>
    </div>
  ),
  DataSourceType: { notion: 'notion' },
}))

vi.mock('@/app/components/base/notion-icon', () => ({
  default: () => <div data-testid="notion-icon" />,
}))

vi.mock('@/app/components/base/toast', () => ({
  default: {
    notify: vi.fn(),
  },
}))

describe('DataSourceNotion', () => {
  const mockWorkspaces = [
    {
      id: 'ws-1',
      source_info: {
        workspace_name: 'Workspace 1',
        total: 10,
        workspace_icon: 'icon-url',
      },
      is_bound: true,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks using unknown bridge to satisfy complex return types
    vi.mocked(useAppContext).mockReturnValue({
      isCurrentWorkspaceManager: true,
    } as unknown as AppContextValue)

    vi.mocked(useDataSourceIntegrates).mockReturnValue({
      data: { data: [] },
    } as unknown as ReturnType<typeof useDataSourceIntegrates>)

    vi.mocked(useNotionConnection).mockReturnValue({
      data: null,
    } as unknown as ReturnType<typeof useNotionConnection>)
  })

  it('should render in not configured state initially', () => {
    render(<DataSourceNotion />)
    expect(screen.getByTestId('is-configured')).toHaveTextContent('false')
  })

  it('should render configured state when workspaces provided', () => {
    vi.mocked(useDataSourceIntegrates).mockReturnValue({
      data: { data: mockWorkspaces },
    } as unknown as ReturnType<typeof useDataSourceIntegrates>)

    render(<DataSourceNotion />)
    expect(screen.getByTestId('is-configured')).toHaveTextContent('true')
    expect(screen.getByTestId('workspace-ws-1')).toHaveTextContent('Workspace 1')
    expect(screen.getByTestId('logo-ws-1')).toBeInTheDocument()
    expect(screen.getByTestId('active-ws-1')).toHaveTextContent('active')
    expect(screen.getByTestId('total-ws-1')).toHaveTextContent('10')
  })

  it('should trigger connection when configure button clicked', async () => {
    render(<DataSourceNotion />)

    const configureBtn = screen.getByTestId('configure-btn')
    configureBtn.click()

    await waitFor(() => {
      expect(useNotionConnection).toHaveBeenCalledWith(true)
    })
  })

  it('should not trigger connection if not workspace manager', () => {
    vi.mocked(useAppContext).mockReturnValue({
      isCurrentWorkspaceManager: false,
    } as unknown as AppContextValue)

    render(<DataSourceNotion />)

    const configureBtn = screen.getByTestId('configure-btn')
    configureBtn.click()

    // Should remain called with false (initial render)
    expect(useNotionConnection).toHaveBeenLastCalledWith(false)
  })

  it('should handle navigation when notion connection data returns url', () => {
    // Mock window.location
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { href: '' },
    })

    vi.mocked(useNotionConnection).mockReturnValue({
      data: { data: 'http://example.com/auth' },
    } as unknown as ReturnType<typeof useNotionConnection>)

    render(<DataSourceNotion />)

    expect(window.location.href).toBe('http://example.com/auth')

    // Cleanup
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    })
  })

  it('should show toast when notion connection returns internal', () => {
    vi.mocked(useNotionConnection).mockReturnValue({
      data: { data: 'internal' },
    } as unknown as ReturnType<typeof useNotionConnection>)

    render(<DataSourceNotion />)

    expect(Toast.notify).toHaveBeenCalledWith({
      type: 'info',
      message: 'dataSource.notion.integratedAlert',
    })
  })

  it('should handle notion connection with unexpected data', () => {
    vi.mocked(useNotionConnection).mockReturnValue({
      data: { data: 'unexpected' },
    } as unknown as ReturnType<typeof useNotionConnection>)

    render(<DataSourceNotion />)
    // No navigation and no toast should happen
    expect(Toast.notify).not.toHaveBeenCalled()
  })

  it('should handle notion connection with non-string data', () => {
    vi.mocked(useNotionConnection).mockReturnValue({
      data: { data: 123 },
    } as unknown as ReturnType<typeof useNotionConnection>)

    render(<DataSourceNotion />)
    // No navigation and no toast should happen
    expect(Toast.notify).not.toHaveBeenCalled()
  })

  it('should handle auth again (change authorized pages) when data not yet available', async () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { href: '' },
    })

    // Mock useNotionConnection to return a URL when enabled becomes true
    vi.mocked(useNotionConnection).mockImplementation((enabled: boolean) => {
      if (enabled) {
        return { data: { data: 'http://example.com/auth-update' } } as unknown as ReturnType<typeof useNotionConnection>
      }
      return { data: null } as unknown as ReturnType<typeof useNotionConnection>
    })

    render(<DataSourceNotion />)

    // Trigger handleAuthAgain via mocked Panel prop
    const authAgainBtn = screen.getByTestId('auth-again-btn')
    authAgainBtn.click()

    await waitFor(() => {
      expect(useNotionConnection).toHaveBeenCalledWith(true)
      expect(window.location.href).toBe('http://example.com/auth-update')
    })

    // Cleanup
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    })
  })

  it('should redirect immediately in handleAuthAgain if data is already available', () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { href: '' },
    })

    vi.mocked(useNotionConnection).mockReturnValue({
      data: { data: 'http://example.com/already-available' },
    } as unknown as ReturnType<typeof useNotionConnection>)

    render(<DataSourceNotion />)

    const authAgainBtn = screen.getByTestId('auth-again-btn')
    authAgainBtn.click()

    expect(window.location.href).toBe('http://example.com/already-available')

    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    })
  })

  it('should handle workspaces passed as props', () => {
    const propWorkspaces = [
      {
        id: 'prop-ws',
        source_info: {
          workspace_name: 'Prop Workspace',
          total: 5,
          workspace_icon: 'prop-icon-url',
        },
        is_bound: true,
      },
    ] as IDataSourceNotion[]

    vi.mocked(useDataSourceIntegrates).mockReturnValue({
      data: { data: propWorkspaces },
    } as unknown as ReturnType<typeof useDataSourceIntegrates>)

    render(<DataSourceNotion workspaces={propWorkspaces} />)

    expect(useDataSourceIntegrates).toHaveBeenCalledWith({
      initialData: { data: propWorkspaces },
    })
    expect(screen.getByTestId('workspace-prop-ws')).toHaveTextContent('Prop Workspace')
  })

  it('should handle undefined integrates data', () => {
    vi.mocked(useDataSourceIntegrates).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useDataSourceIntegrates>)

    render(<DataSourceNotion />)
    expect(screen.getByTestId('is-configured')).toHaveTextContent('false')
  })

  it('should handle workspace without total and icon', () => {
    const mockWorkspacesMinimal = [
      {
        id: 'ws-minimal',
        source_info: {
          workspace_name: 'Minimal WS',
          workspace_icon: null,
          total: undefined,
        },
        is_bound: false,
      },
    ] as unknown as IDataSourceNotion[]

    vi.mocked(useDataSourceIntegrates).mockReturnValue({
      data: { data: mockWorkspacesMinimal },
    } as unknown as ReturnType<typeof useDataSourceIntegrates>)

    render(<DataSourceNotion />)
    expect(screen.getByTestId('workspace-ws-minimal')).toHaveTextContent('Minimal WS')
    expect(screen.getByTestId('total-ws-minimal')).toHaveTextContent('0')
    expect(screen.getByTestId('active-ws-minimal')).toHaveTextContent('inactive')
  })
})
