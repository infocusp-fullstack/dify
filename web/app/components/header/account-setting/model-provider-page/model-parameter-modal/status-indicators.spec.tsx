import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import StatusIndicators from './status-indicators'

// Mock dependencies
vi.mock('@/service/use-plugins', () => ({
  useInstalledPluginList: () => ({ data: { plugins: [] } }),
}))

// Mock Tooltip to render content directly for assertions
vi.mock('@/app/components/base/tooltip', () => ({
  default: ({ popupContent }: { popupContent: React.ReactNode }) => <div data-testid="tooltip">{popupContent}</div>,
}))

vi.mock('@/app/components/workflow/nodes/_base/components/switch-plugin-version', () => ({
  SwitchPluginVersion: () => <div>SwitchVersion</div>,
}))

const t = (key: string) => key

describe('StatusIndicators', () => {
  it('should render nothing if all good', () => {
    const { container } = render(
      <StatusIndicators
        needsConfiguration={true}
        modelProvider={true}
        inModelList={true}
        disabled={false}
        pluginInfo={null}
        t={t}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('should render warning if deprecated', () => {
    render(
      <StatusIndicators
        needsConfiguration={false}
        modelProvider={true}
        inModelList={true}
        disabled={true}
        pluginInfo={null}
        t={t}
      />,
    )
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('should render marketplace warning if not provider and not plugin', () => {
    render(
      <StatusIndicators
        needsConfiguration={false}
        modelProvider={false}
        inModelList={false}
        disabled={false}
        pluginInfo={null}
        t={t}
      />,
    )
    // Should show tooltip for "not in marketplace"
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    // Content check relies on translation key
    expect(screen.getByText('nodes.agent.modelNotInMarketplace.title')).toBeInTheDocument()
  })
})
