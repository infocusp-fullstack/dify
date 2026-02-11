import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ValidatedStatus } from './declarations'
import KeyInput from './KeyInput'

type Props = ComponentProps<typeof KeyInput>

const createProps = (overrides: Partial<Props> = {}): Props => ({
  name: 'API key',
  placeholder: 'Enter API key',
  value: 'initial-value',
  onChange: vi.fn(),
  onFocus: undefined,
  validating: false,
  validatedStatusState: {},
  ...overrides,
})

describe('KeyInput', () => {
  it('shows the label and placeholder value', () => {
    const props = createProps()
    render(<KeyInput {...props} />)

    expect(screen.getByText('API key')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter API key')).toHaveValue('initial-value')
  })

  it('reports the typed value to onChange', () => {
    const props = createProps()
    render(<KeyInput {...props} />)

    fireEvent.change(screen.getByPlaceholderText('Enter API key'), { target: { value: 'updated' } })

    expect(props.onChange).toHaveBeenCalledWith('updated')
  })

  it('cycles through validating and error messaging', () => {
    const props = createProps()
    const { rerender } = render(
      <KeyInput {...props} validating validatedStatusState={{}} />,
    )

    expect(screen.getByText('common.provider.validating')).toBeInTheDocument()

    rerender(
      <KeyInput
        {...props}
        validating={false}
        validatedStatusState={{ status: ValidatedStatus.Error, message: 'bad-request' }}
      />,
    )

    expect(screen.getByText('common.provider.validatedErrorbad-request')).toBeInTheDocument()
  })
})
