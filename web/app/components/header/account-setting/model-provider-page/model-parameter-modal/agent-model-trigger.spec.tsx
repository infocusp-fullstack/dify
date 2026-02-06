import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import AgentModelTrigger from './agent-model-trigger'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock dependencies
vi.mock('@/context/provider-context', () => ({
  useProviderContext: () => ({
    modelProviders: [],
  }),
}))

vi.mock('@/service/use-plugins', () => ({
  useInvalidateInstalledPluginList: () => vi.fn(),
  useModelInList: () => ({ data: true }),
  usePluginInfo: () => ({ data: null, isLoading: false }),
}))

vi.mock('../hooks', () => ({
  useModelModalHandler: () => vi.fn(),
  useUpdateModelList: () => vi.fn(),
  useUpdateModelProviders: () => vi.fn(),
}))

vi.mock('../model-icon', () => ({
  default: () => <div>Icon</div>,
}))

vi.mock('./model-display', () => ({
  default: () => <div>ModelDisplay</div>,
}))

vi.mock('./status-indicators', () => ({
  default: () => <div>StatusIndicators</div>,
}))

describe('AgentModelTrigger', () => {
  it('should render configured state', () => {
    render(
      <AgentModelTrigger
        modelId="gpt-4"
        providerName="openai"
      />,
    )
    expect(screen.getByText('ModelDisplay')).toBeInTheDocument()
    expect(screen.getByText('StatusIndicators')).toBeInTheDocument()
  })

  it('should render unconfigured state', () => {
    render(<AgentModelTrigger />)
    expect(screen.getByText('nodes.agent.configureModel')).toBeInTheDocument()
  })
})
