import { fireEvent, render, screen } from '@testing-library/react'
import ViewFormDropdown from './view-form-dropdown'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@remixicon/react', () => ({
  RiChatSettingsLine: ({ className }: { className?: string }) => <svg data-testid="settings-icon" className={className} />,
}))

vi.mock('@/app/components/base/action-button', () => ({
  default: ({ children, state }: { children: React.ReactNode, state: string }) => (
    <button data-testid="action-button" data-state={state}>{children}</button>
  ),
  ActionButtonState: {
    Default: 'default',
    Hover: 'hover',
  },
}))

vi.mock('@/app/components/base/chat/embedded-chatbot/inputs-form/content', () => ({
  default: () => <div data-testid="inputs-form-content">InputsFormContent</div>,
}))

vi.mock('@/app/components/base/icons/src/public/other', () => ({
  Message3Fill: () => <svg data-testid="message-icon" />,
}))

vi.mock('@/app/components/base/portal-to-follow-elem', () => ({
  PortalToFollowElem: ({ children, open }: { children: React.ReactNode, open: boolean }) => (
    <div data-testid="portal-root" data-open={open}>{children}</div>
  ),
  PortalToFollowElemTrigger: ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => (
    <div data-testid="portal-trigger" onClick={onClick}>{children}</div>
  ),
  PortalToFollowElemContent: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div data-testid="portal-content" className={className}>{children}</div>
  ),
}))

describe('ViewFormDropdown', () => {
  it('should render trigger button with default styles', () => {
    render(<ViewFormDropdown />)

    expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
    expect(screen.getByTestId('action-button')).toHaveAttribute('data-state', 'default')
  })

  it('should apply custom icon color via props', () => {
    const customColor = 'text-blue-500'
    render(<ViewFormDropdown iconColor={customColor} />)

    expect(screen.getByTestId('settings-icon')).toHaveClass(customColor)
  })

  it('should open the dropdown when clicking the trigger', () => {
    render(<ViewFormDropdown />)

    const trigger = screen.getByTestId('portal-trigger')
    fireEvent.click(trigger)

    // Verify state change reflects in the Portal and ActionButton
    expect(screen.getByTestId('portal-root')).toHaveAttribute('data-open', 'true')
    expect(screen.getByTestId('action-button')).toHaveAttribute('data-state', 'hover')
  })

  it('should render header and form content correctly when open', () => {
    render(<ViewFormDropdown />)

    fireEvent.click(screen.getByTestId('portal-trigger'))

    expect(screen.getByText('chat.chatSettingsTitle')).toBeInTheDocument()
    expect(screen.getByTestId('message-icon')).toBeInTheDocument()
    expect(screen.getByTestId('inputs-form-content')).toBeInTheDocument()
    expect(screen.getByTestId('portal-content')).toHaveClass('z-[99]')
  })

  it('should toggle state back to closed when clicking trigger a second time', () => {
    render(<ViewFormDropdown />)
    const trigger = screen.getByTestId('portal-trigger')

    // Open
    fireEvent.click(trigger)
    expect(screen.getByTestId('portal-root')).toHaveAttribute('data-open', 'true')

    // Close
    fireEvent.click(trigger)
    expect(screen.getByTestId('portal-root')).toHaveAttribute('data-open', 'false')
    expect(screen.getByTestId('action-button')).toHaveAttribute('data-state', 'default')
  })
})
