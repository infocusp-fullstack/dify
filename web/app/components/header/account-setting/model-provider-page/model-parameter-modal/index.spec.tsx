import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import ModelParameterModal from './index'

// Mock dependencies
vi.mock('@/context/provider-context', () => ({
  useProviderContext: () => ({
    isAPIKeySet: true,
  }),
}))

vi.mock('@/service/use-common', () => ({
  useModelParameterRules: () => ({
    data: {
      data: [
        {
          name: 'temperature',
          label: { en_US: 'Temperature' },
          type: 'float',
          default: 0.7,
          min: 0,
          max: 1,
          help: { en_US: 'Control randomness' },
        },
      ],
    },
    isPending: false,
  }),
}))

vi.mock('../hooks', () => ({
  useTextGenerationCurrentProviderAndModelAndModelList: () => ({
    currentProvider: { provider: 'openai', label: { en_US: 'OpenAI' } },
    currentModel: {
      model: 'gpt-3.5-turbo',
      status: 'active',
      model_properties: { mode: 'chat' },
    },
    activeTextGenerationModelList: [
      {
        provider: 'openai',
        models: [
          {
            model: 'gpt-3.5-turbo',
            model_properties: { mode: 'chat' },
          },
        ],
      },
    ],
  }),
}))

// Mock PortalToFollowElem components to control visibility and simplify testing
vi.mock('@/app/components/base/portal-to-follow-elem', () => {
  return {
    PortalToFollowElem: ({ children }: { children: React.ReactNode }) => {
      return (
        <div>
          <div data-testid="portal-wrapper">
            {children}
          </div>
        </div>
      )
    },
    PortalToFollowElemTrigger: ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => (
      <div data-testid="portal-trigger" onClick={onClick}>
        {children}
      </div>
    ),
    PortalToFollowElemContent: ({ children, className }: { children: React.ReactNode, className: string }) => (
      <div data-testid="portal-content" className={className}>
        {children}
      </div>
    ),
  }
})

vi.mock('./parameter-item', () => ({
  default: ({ parameterRule, value, onChange, onSwitch }: { parameterRule: { name: string, label: { en_US: string } }, value: string | number, onChange: (v: number) => void, onSwitch: (checked: boolean, val: unknown) => void }) => (
    <div data-testid={`param-${parameterRule.name}`}>
      {parameterRule.label.en_US}
      <input
        aria-label={parameterRule.name}
        value={value || ''}
        onChange={e => onChange(Number(e.target.value))}
      />
      <button onClick={() => onSwitch?.(false, undefined)}>Remove</button>
    </div>
  ),
}))

vi.mock('../model-selector', () => ({
  default: () => <div data-testid="model-selector">Model Selector</div>,
}))

vi.mock('./presets-parameter', () => ({
  default: ({ onSelect }: { onSelect: (id: number) => void }) => (
    <button onClick={() => onSelect(1)}>Preset 1</button>
  ),
}))

vi.mock('./trigger', () => ({
  default: () => <button>Open Settings</button>,
}))

vi.mock('@/utils/classnames', () => ({
  cn: (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' '),
}))

// Mock config
vi.mock('@/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config')>()
  return {
    ...actual,
    PROVIDER_WITH_PRESET_TONE: ['openai'], // ensure presets mock renders
  }
})

describe('ModelParameterModal', () => {
  const defaultProps = {
    isAdvancedMode: false,
    modelId: 'gpt-3.5-turbo',
    provider: 'openai',
    setModel: vi.fn(),
    completionParams: { temperature: 0.7 },
    onCompletionParamsChange: vi.fn(),
    hideDebugWithMultipleModel: false,
    debugWithMultipleModel: false,
    onDebugWithMultipleModelChange: vi.fn(),
    readonly: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render trigger and content', () => {
    render(<ModelParameterModal {...defaultProps} />)

    expect(screen.getByText('Open Settings')).toBeInTheDocument()
    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.getByTestId('model-selector')).toBeInTheDocument()
  })

  it('should update params when changed', () => {
    render(<ModelParameterModal {...defaultProps} />)

    const input = screen.getByLabelText('temperature')
    fireEvent.change(input, { target: { value: '0.9' } })

    expect(defaultProps.onCompletionParamsChange).toHaveBeenCalledWith({
      ...defaultProps.completionParams,
      temperature: 0.9,
    })
  })

  it('should handle preset selection', () => {
    render(<ModelParameterModal {...defaultProps} />)

    fireEvent.click(screen.getByText('Preset 1'))
    expect(defaultProps.onCompletionParamsChange).toHaveBeenCalled()
  })

  it('should handle debug mode toggle', () => {
    render(<ModelParameterModal {...defaultProps} />)
    const toggle = screen.getByText(/debugAsMultipleModel/i)
    fireEvent.click(toggle)
    expect(defaultProps.onDebugWithMultipleModelChange).toHaveBeenCalled()
  })
  it('should handle custom renderTrigger', () => {
    const renderTrigger = vi.fn().mockReturnValue(<div>Custom Trigger</div>)
    render(<ModelParameterModal {...defaultProps} renderTrigger={renderTrigger} />)

    expect(screen.getByText('Custom Trigger')).toBeInTheDocument()
    expect(renderTrigger).toHaveBeenCalled()
  })

  it('should handle parameter removal (switch off)', () => {
    render(<ModelParameterModal {...defaultProps} />)

    const removeBtn = screen.getByText('Remove')
    fireEvent.click(removeBtn)

    const { temperature, ...expected } = defaultProps.completionParams
    void temperature

    expect(defaultProps.onCompletionParamsChange).toHaveBeenCalledWith(expected)
  })
})
