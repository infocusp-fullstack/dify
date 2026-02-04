import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Toast from '@/app/components/base/toast'
import * as ServiceCommon from '@/service/common'
import Operate from './index'

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/toast', () => ({
  default: {
    notify: vi.fn(),
  },
}))

vi.mock('@/service/common', () => ({
  syncDataSourceNotion: vi.fn(),
  updateDataSourceNotionAction: vi.fn(),
}))

vi.mock('@/service/use-common', () => ({
  useInvalidDataSourceIntegrates: () => vi.fn(),
}))

// Mock Headless UI Menu
vi.mock('@headlessui/react', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@headlessui/react')>()
  return {
    ...mod,
    Transition: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }
})

describe('Operate Component', () => {
  const mockPayload = {
    id: 'test-id',
    total: 10,
  }
  const mockOnAuthAgain = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<Operate payload={mockPayload} onAuthAgain={mockOnAuthAgain} />)
    // The button should be visible (RiMoreFill icon)
    // We can find by role button
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens menu and displays items', async () => {
    render(<Operate payload={mockPayload} onAuthAgain={mockOnAuthAgain} />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(screen.getByText('dataSource.notion.changeAuthorizedPages')).toBeInTheDocument()
    expect(screen.getByText('10 dataSource.notion.pagesAuthorized')).toBeInTheDocument()
    expect(screen.getByText('dataSource.notion.sync')).toBeInTheDocument()
    expect(screen.getByText('dataSource.notion.remove')).toBeInTheDocument()
  })

  it('calls onAuthAgain when change authorized pages is clicked', async () => {
    render(<Operate payload={mockPayload} onAuthAgain={mockOnAuthAgain} />)

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('dataSource.notion.changeAuthorizedPages'))

    expect(mockOnAuthAgain).toHaveBeenCalled()
  })

  it('handles sync action correctly', async () => {
    render(<Operate payload={mockPayload} onAuthAgain={mockOnAuthAgain} />)

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('dataSource.notion.sync'))

    expect(ServiceCommon.syncDataSourceNotion).toHaveBeenCalledWith({
      url: `/oauth/data-source/notion/${mockPayload.id}/sync`,
    })

    await waitFor(() => {
      expect(Toast.notify).toHaveBeenCalledWith({
        type: 'success',
        message: 'api.success',
      })
    })
  })

  it('handles remove action correctly', async () => {
    render(<Operate payload={mockPayload} onAuthAgain={mockOnAuthAgain} />)

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('dataSource.notion.remove'))

    expect(ServiceCommon.updateDataSourceNotionAction).toHaveBeenCalledWith({
      url: `/data-source/integrates/${mockPayload.id}/disable`,
    })

    await waitFor(() => {
      expect(Toast.notify).toHaveBeenCalledWith({
        type: 'success',
        message: 'api.success',
      })
    })
  })
})
