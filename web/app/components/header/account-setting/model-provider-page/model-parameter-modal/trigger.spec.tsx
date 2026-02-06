import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Trigger from './trigger'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../hooks', () => ({
  useLanguage: () => 'en_US',
}))

vi.mock('@/context/provider-context', () => ({
  useProviderContext: () => ({
    modelProviders: [{ provider: 'openai', label: { en_US: 'OpenAI' } }],
  }),
}))

vi.mock('../model-icon', () => ({
  default: () => <div data-testid="model-icon">Icon</div>,
}))

vi.mock('../model-name', () => ({
  default: ({ modelItem }: { modelItem: { model: string } }) => <div>{modelItem.model}</div>,
}))

describe('Trigger', () => {
  it('should render initialized state', () => {
    render(
      <Trigger
        currentProvider={{ provider: 'openai', label: { en_US: 'OpenAI' } } as unknown as ComponentProps<typeof Trigger>['currentProvider']}
        currentModel={{ model: 'gpt-4' } as unknown as ComponentProps<typeof Trigger>['currentModel']}
      />,
    )
    expect(screen.getByText('gpt-4')).toBeInTheDocument()
    expect(screen.getByTestId('model-icon')).toBeInTheDocument()
  })

  it('should render disabled state', () => {
    render(
      <Trigger
        disabled
        modelId="gpt-4"
        providerName="openai"
      />,
    )
  })
})
