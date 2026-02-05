import { fireEvent, render, screen } from '@testing-library/react'
import Confirm from '.'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../tooltip', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-mock">{children}</div>
  ),
}))

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')

  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  }
})

const onCancel = vi.fn()
const onConfirm = vi.fn()

describe('Confirm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders confirm correctly', async () => {
    render(<Confirm isShow={true} title="test title" onCancel={onCancel} onConfirm={onConfirm} />)
    expect(await screen.findByTestId('tooltip-mock')).toBeInTheDocument()
    expect(await screen.findByText('test title')).toBeInTheDocument()
  })

  it('does not render on isShow false', () => {
    const { container } = render(<Confirm isShow={false} title="test title" onCancel={onCancel} onConfirm={onConfirm} />)
    expect(container.firstChild).toBeNull()
  })

  it('clickAway is handled properly', () => {
    render(<Confirm isShow={true} title="test title" onCancel={onCancel} onConfirm={onConfirm} />)
    const overlay = document.body.querySelector('.bg-background-overlay') as HTMLElement
    expect(overlay).toBeTruthy()
    fireEvent.mouseDown(overlay)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('escape keyboard event works', () => {
    render(<Confirm isShow={true} title="test title" onCancel={onCancel} onConfirm={onConfirm} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('Enter keyboard event works', () => {
    render(<Confirm isShow={true} title="test title" onCancel={onCancel} onConfirm={onConfirm} />)
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('showCancel prop works', () => {
    const { container } = render(<Confirm isShow={true} title="test title" onCancel={onCancel} onConfirm={onConfirm} showCancel={false} />)
    expect(container.querySelector('.btn')?.innerHTML).toBe('operation.confirm')
  })

  it('showConfirm prop works', () => {
    const { container } = render(<Confirm isShow={true} title="test title" onCancel={onCancel} onConfirm={onConfirm} showConfirm={false} />)
    expect(container.querySelector('.btn')?.innerHTML).toBe('operation.cancel')
  })
})
