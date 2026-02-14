import type { Form } from './declarations'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import KeyValidator from './index'

const mockEmit = vi.fn()
let subscriptionCallback: ((value: string) => void) | null = null

vi.mock('@/context/event-emitter', () => ({
  useEventEmitterContextContext: () => ({
    eventEmitter: {
      emit: mockEmit,
      useSubscription: (cb: (value: string) => void) => {
        subscriptionCallback = cb
      },
    },
  }),
}))

const mockValidate = vi.fn()
const mockUseValidate = vi.fn()

vi.mock('./hooks', () => ({
  useValidate: (...args: unknown[]) => mockUseValidate(...args),
}))

describe('KeyValidator', () => {
  const formValidate = {
    before: () => true,
  }

  const forms: Form[] = [
    {
      key: 'apiKey',
      title: 'API key',
      placeholder: 'Enter API key',
      value: 'initial-key',
      validate: formValidate,
    },
  ]

  const createProps = () => ({
    type: 'test-provider',
    title: <div>Provider key</div>,
    status: 'add' as const,
    forms,
    keyFrom: {
      text: 'Get key',
      link: 'https://example.com/key',
    },
    onSave: vi.fn().mockResolvedValue(true),
    disabled: false,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    subscriptionCallback = null
    mockUseValidate.mockReturnValue([mockValidate, false, {}])
  })

  it('should open the editor and show key fields when add key is clicked', () => {
    render(<KeyValidator {...createProps()} />)

    fireEvent.click(screen.getByText('common.provider.addKey'))

    expect(screen.getByPlaceholderText('Enter API key')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Get key' })).toBeInTheDocument()
  })

  it('should submit the updated value when save is clicked', async () => {
    const props = createProps()
    render(<KeyValidator {...props} />)

    fireEvent.click(screen.getByText('common.provider.addKey'))
    fireEvent.change(screen.getByPlaceholderText('Enter API key'), {
      target: { value: 'updated-key' },
    })
    fireEvent.click(screen.getByText('common.operation.save'))

    await waitFor(() => {
      expect(props.onSave).toHaveBeenCalledWith({ apiKey: 'updated-key' })
    })
  })

  it('should close and reset edited values when another validator emits a trigger', () => {
    render(<KeyValidator {...createProps()} />)

    fireEvent.click(screen.getByText('common.provider.addKey'))
    fireEvent.change(screen.getByPlaceholderText('Enter API key'), {
      target: { value: 'changed' },
    })

    act(() => {
      subscriptionCallback?.('plugins/another-provider')
    })

    expect(screen.queryByPlaceholderText('Enter API key')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('common.provider.addKey'))

    expect(screen.getByPlaceholderText('Enter API key')).toHaveValue('initial-key')
  })

  it('should prevent opening key editor when disabled', () => {
    render(<KeyValidator {...createProps()} disabled />)

    fireEvent.click(screen.getByText('common.provider.addKey'))

    expect(screen.queryByPlaceholderText('Enter API key')).not.toBeInTheDocument()
  })
})
