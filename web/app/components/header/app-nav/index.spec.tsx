import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useParams } from 'next/navigation'
import { useStore as useAppStore } from '@/app/components/app/store'
import { useAppContext } from '@/context/app-context'
import { useInfiniteAppList } from '@/service/use-apps'
import { AppModeEnum } from '@/types/app'
import AppNav from './index'

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
  })),
}))

vi.mock('@/context/app-context', () => ({
  useAppContext: vi.fn(),
}))

vi.mock('@/app/components/app/store', () => ({
  useStore: vi.fn(),
}))

vi.mock('@/service/use-apps', () => ({
  useInfiniteAppList: vi.fn(),
}))

vi.mock('@/app/components/app/create-app-dialog', () => ({
  default: ({ show, onClose, onSuccess }: { show: boolean, onClose: () => void, onSuccess: () => void }) =>
    show
      ? (
          <div
            data-testid="create-app-template-dialog"
            onClick={() => {
              onClose()
              onSuccess()
            }}
          >
            Create Template
          </div>
        )
      : null,
}))

vi.mock('@/app/components/app/create-app-modal', () => ({
  default: ({ show, onClose, onSuccess }: { show: boolean, onClose: () => void, onSuccess: () => void }) =>
    show
      ? (
          <div
            data-testid="create-app-modal"
            onClick={() => {
              onClose()
              onSuccess()
            }}
          >
            Create App
          </div>
        )
      : null,
}))

vi.mock('@/app/components/app/create-from-dsl-modal', () => ({
  default: ({ show, onClose, onSuccess }: { show: boolean, onClose: () => void, onSuccess: () => void }) =>
    show
      ? (
          <div
            data-testid="create-from-dsl-modal"
            onClick={() => {
              onClose()
              onSuccess()
            }}
          >
            Create from DSL
          </div>
        )
      : null,
}))

vi.mock('../nav', () => ({
  default: ({ onCreate, onLoadMore }: { onCreate: (state: string) => void, onLoadMore?: () => void }) => (
    <div data-testid="nav">
      <button onClick={() => onCreate('blank')} data-testid="create-blank">
        Create Blank
      </button>
      <button onClick={() => onCreate('template')} data-testid="create-template">
        Create Template
      </button>
      <button onClick={() => onCreate('dsl')} data-testid="create-dsl">
        Create DSL
      </button>
      <button onClick={onLoadMore} data-testid="load-more">
        Load More
      </button>
    </div>
  ),
}))

const mockAppData = [
  {
    id: 'app-1',
    name: 'App 1',
    mode: AppModeEnum.AGENT_CHAT,
    icon_type: 'emoji',
    icon: '🤖',
    icon_background: null,
    icon_url: null,
  },
  {
    id: 'app-2',
    name: 'App 2',
    mode: AppModeEnum.WORKFLOW,
    icon_type: 'emoji',
    icon: '⚙️',
    icon_background: null,
    icon_url: null,
  },
  {
    id: 'app-3',
    name: 'App 3',
    mode: AppModeEnum.ADVANCED_CHAT,
    icon_type: 'emoji',
    icon: '💬',
    icon_background: null,
    icon_url: null,
  },
]

const createDefaultMocks = () => {
  vi.mocked(useParams).mockReturnValue({ appId: 'app-1' } as unknown as ReturnType<typeof useParams>)
  vi.mocked(useAppContext).mockReturnValue({
    isCurrentWorkspaceEditor: false,
  } as unknown as ReturnType<typeof useAppContext>)
  vi.mocked(useAppStore).mockImplementation((selector: unknown) =>
    (selector as (state: unknown) => unknown)({ appDetail: null }),
  )
  vi.mocked(useInfiniteAppList).mockReturnValue({
    data: { pages: [{ data: mockAppData }] },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useInfiniteAppList>)
}

describe('AppNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createDefaultMocks()
  })

  describe('Rendering', () => {
    it('should render nav component', () => {
      render(<AppNav />)
      expect(screen.getByTestId('nav')).toBeInTheDocument()
    })

    it('should render all modal dialogs', () => {
      render(<AppNav />)
      expect(screen.queryByTestId('create-app-modal')).not.toBeInTheDocument()
      expect(screen.queryByTestId('create-app-template-dialog')).not.toBeInTheDocument()
      expect(screen.queryByTestId('create-from-dsl-modal')).not.toBeInTheDocument()
    })
  })

  describe('Create App Modal', () => {
    it('should open create app modal when onCreate called with blank', async () => {
      const user = userEvent.setup()
      render(<AppNav />)

      const createBlankBtn = screen.getByTestId('create-blank')
      await user.click(createBlankBtn)

      await waitFor(() => {
        expect(screen.getByTestId('create-app-modal')).toBeInTheDocument()
      })
    })

    it('should close create app modal', async () => {
      const user = userEvent.setup()
      render(<AppNav />)

      await user.click(screen.getByTestId('create-blank'))
      await waitFor(() => {
        expect(screen.getByTestId('create-app-modal')).toBeInTheDocument()
      })

      const modal = screen.getByTestId('create-app-modal')
      await user.click(modal)

      await waitFor(() => {
        expect(screen.queryByTestId('create-app-modal')).not.toBeInTheDocument()
      })
    })

    it('should call refetch on modal success', async () => {
      const refetchMock = vi.fn()
      vi.mocked(useInfiniteAppList).mockReturnValue({
        data: { pages: [{ data: mockAppData }] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch: refetchMock,
      } as unknown as ReturnType<typeof useInfiniteAppList>)

      const user = userEvent.setup()
      render(<AppNav />)

      await user.click(screen.getByTestId('create-blank'))
      await waitFor(() => {
        expect(screen.getByTestId('create-app-modal')).toBeInTheDocument()
      })

      const modal = screen.getByTestId('create-app-modal')
      await user.click(modal)

      await waitFor(() => {
        expect(refetchMock).toHaveBeenCalled()
      })
    })
  })

  describe('Create App Template Dialog', () => {
    it('should open create app template dialog when onCreate called with template', async () => {
      const user = userEvent.setup()
      render(<AppNav />)

      const createTemplateBtn = screen.getByTestId('create-template')
      await user.click(createTemplateBtn)

      await waitFor(() => {
        expect(screen.getByTestId('create-app-template-dialog')).toBeInTheDocument()
      })
    })

    it('should close create app template dialog', async () => {
      const user = userEvent.setup()
      render(<AppNav />)

      await user.click(screen.getByTestId('create-template'))
      await waitFor(() => {
        expect(screen.getByTestId('create-app-template-dialog')).toBeInTheDocument()
      })

      const dialog = screen.getByTestId('create-app-template-dialog')
      await user.click(dialog)

      await waitFor(() => {
        expect(screen.queryByTestId('create-app-template-dialog')).not.toBeInTheDocument()
      })
    })

    it('should call refetch on template dialog success', async () => {
      const refetchMock = vi.fn()
      vi.mocked(useInfiniteAppList).mockReturnValue({
        data: { pages: [{ data: mockAppData }] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch: refetchMock,
      } as unknown as ReturnType<typeof useInfiniteAppList>)

      const user = userEvent.setup()
      render(<AppNav />)

      await user.click(screen.getByTestId('create-template'))
      await waitFor(() => {
        expect(screen.getByTestId('create-app-template-dialog')).toBeInTheDocument()
      })

      const dialog = screen.getByTestId('create-app-template-dialog')
      await user.click(dialog)

      await waitFor(() => {
        expect(refetchMock).toHaveBeenCalled()
      })
    })
  })

  describe('Create From DSL Modal', () => {
    it('should open create from dsl modal when onCreate called with dsl', async () => {
      const user = userEvent.setup()
      render(<AppNav />)

      const createDslBtn = screen.getByTestId('create-dsl')
      await user.click(createDslBtn)

      await waitFor(() => {
        expect(screen.getByTestId('create-from-dsl-modal')).toBeInTheDocument()
      })
    })

    it('should close create from dsl modal', async () => {
      const user = userEvent.setup()
      render(<AppNav />)

      await user.click(screen.getByTestId('create-dsl'))
      await waitFor(() => {
        expect(screen.getByTestId('create-from-dsl-modal')).toBeInTheDocument()
      })

      const modal = screen.getByTestId('create-from-dsl-modal')
      await user.click(modal)

      await waitFor(() => {
        expect(screen.queryByTestId('create-from-dsl-modal')).not.toBeInTheDocument()
      })
    })

    it('should call refetch on dsl modal success', async () => {
      const refetchMock = vi.fn()
      vi.mocked(useInfiniteAppList).mockReturnValue({
        data: { pages: [{ data: mockAppData }] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch: refetchMock,
      } as unknown as ReturnType<typeof useInfiniteAppList>)

      const user = userEvent.setup()
      render(<AppNav />)

      await user.click(screen.getByTestId('create-dsl'))
      await waitFor(() => {
        expect(screen.getByTestId('create-from-dsl-modal')).toBeInTheDocument()
      })

      const modal = screen.getByTestId('create-from-dsl-modal')
      await user.click(modal)

      await waitFor(() => {
        expect(refetchMock).toHaveBeenCalled()
      })
    })
  })

  describe('Navigation Items', () => {
    it('should build nav items from appsData when available', async () => {
      render(<AppNav />)

      await waitFor(() => {
        expect(useInfiniteAppList).toHaveBeenCalledWith(
          {
            page: 1,
            limit: 30,
            name: '',
          },
          { enabled: true },
        )
      })
    })

    it('should generate correct links for non-editor workspace', async () => {
      vi.mocked(useAppContext).mockReturnValue({
        isCurrentWorkspaceEditor: false,
      } as unknown as ReturnType<typeof useAppContext>)

      render(<AppNav />)

      await waitFor(() => {
        expect(useInfiniteAppList).toHaveBeenCalled()
      })
    })

    it('should generate workflow links for editor workspace with workflow app', async () => {
      vi.mocked(useAppContext).mockReturnValue({
        isCurrentWorkspaceEditor: true,
      } as unknown as ReturnType<typeof useAppContext>)

      render(<AppNav />)

      await waitFor(() => {
        expect(useInfiniteAppList).toHaveBeenCalled()
      })
    })

    it('should generate configuration links for editor workspace with non-workflow app', async () => {
      vi.mocked(useAppContext).mockReturnValue({
        isCurrentWorkspaceEditor: true,
      } as unknown as ReturnType<typeof useAppContext>)

      vi.mocked(useInfiniteAppList).mockReturnValue({
        data: {
          pages: [
            {
              data: [
                {
                  id: 'app-1',
                  name: 'App 1',
                  mode: AppModeEnum.AGENT_CHAT,
                  icon_type: 'emoji',
                  icon: '🤖',
                  icon_background: null,
                  icon_url: null,
                },
              ],
            },
          ],
        },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInfiniteAppList>)

      render(<AppNav />)

      await waitFor(() => {
        expect(useInfiniteAppList).toHaveBeenCalled()
      })
    })

    it('should update nav items when appDetail changes', async () => {
      const { rerender } = render(<AppNav />)

      vi.mocked(useAppStore).mockImplementation((selector: unknown) =>
        (selector as (state: unknown) => unknown)({
          appDetail: {
            id: 'app-1',
            name: 'Updated App Name',
          },
        }),
      )

      rerender(<AppNav />)

      await waitFor(() => {
        expect(useAppStore).toHaveBeenCalled()
      })
    })
  })

  describe('Load More', () => {
    it('should call fetchNextPage when handleLoadMore and hasNextPage is true', async () => {
      const fetchNextPageMock = vi.fn()
      vi.mocked(useInfiniteAppList).mockReturnValue({
        data: { pages: [{ data: mockAppData }] },
        fetchNextPage: fetchNextPageMock,
        hasNextPage: true,
        isFetchingNextPage: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInfiniteAppList>)

      const user = userEvent.setup()
      render(<AppNav />)

      const loadMoreBtn = screen.getByTestId('load-more')
      await user.click(loadMoreBtn)

      await waitFor(() => {
        expect(fetchNextPageMock).toHaveBeenCalled()
      })
    })

    it('should not call fetchNextPage when hasNextPage is false', async () => {
      const fetchNextPageMock = vi.fn()
      vi.mocked(useInfiniteAppList).mockReturnValue({
        data: { pages: [{ data: mockAppData }] },
        fetchNextPage: fetchNextPageMock,
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInfiniteAppList>)

      const user = userEvent.setup()
      render(<AppNav />)

      const loadMoreBtn = screen.getByTestId('load-more')
      await user.click(loadMoreBtn)

      expect(fetchNextPageMock).not.toHaveBeenCalled()
    })

    it('should handle undefined onLoadMore gracefully', () => {
      vi.mocked(useInfiniteAppList).mockReturnValue({
        data: { pages: [{ data: mockAppData }] },
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInfiniteAppList>)

      render(<AppNav />)
      expect(screen.getByTestId('nav')).toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('should initialize all modal states as false', () => {
      render(<AppNav />)

      expect(screen.queryByTestId('create-app-modal')).not.toBeInTheDocument()
      expect(screen.queryByTestId('create-app-template-dialog')).not.toBeInTheDocument()
      expect(screen.queryByTestId('create-from-dsl-modal')).not.toBeInTheDocument()
    })

    it('should only show one modal at a time', async () => {
      const user = userEvent.setup()
      render(<AppNav />)

      await user.click(screen.getByTestId('create-blank'))
      await waitFor(() => {
        expect(screen.getByTestId('create-app-modal')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('create-app-template-dialog')).not.toBeInTheDocument()
      expect(screen.queryByTestId('create-from-dsl-modal')).not.toBeInTheDocument()
    })
  })

  describe('useInfiniteAppList Hook', () => {
    it('should enable infinite app list when appId exists', () => {
      vi.mocked(useParams).mockReturnValue({ appId: 'app-1' } as unknown as ReturnType<typeof useParams>)

      render(<AppNav />)

      expect(useInfiniteAppList).toHaveBeenCalledWith(
        expect.any(Object),
        { enabled: true },
      )
    })

    it('should disable infinite app list when appId is not provided', () => {
      vi.mocked(useParams).mockReturnValue({ appId: undefined } as unknown as ReturnType<typeof useParams>)

      render(<AppNav />)

      expect(useInfiniteAppList).toHaveBeenCalledWith(
        expect.any(Object),
        { enabled: false },
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty appsData', () => {
      vi.mocked(useInfiniteAppList).mockReturnValue({
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInfiniteAppList>)

      render(<AppNav />)
      expect(screen.getByTestId('nav')).toBeInTheDocument()
    })

    it('should handle appsData with no pages', () => {
      vi.mocked(useInfiniteAppList).mockReturnValue({
        data: { pages: [] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInfiniteAppList>)

      render(<AppNav />)
      expect(screen.getByTestId('nav')).toBeInTheDocument()
    })

    it('should handle appsData with empty pages', () => {
      vi.mocked(useInfiniteAppList).mockReturnValue({
        data: { pages: [{ data: [] }] },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInfiniteAppList>)

      render(<AppNav />)
      expect(screen.getByTestId('nav')).toBeInTheDocument()
    })

    it('should handle null appDetail', () => {
      vi.mocked(useAppStore).mockImplementation((selector: unknown) =>
        (selector as (state: unknown) => unknown)({ appDetail: null }),
      )

      render(<AppNav />)
      expect(screen.getByTestId('nav')).toBeInTheDocument()
    })

    it('should handle app without matching id in appDetail', async () => {
      vi.mocked(useAppStore).mockImplementation((selector: unknown) =>
        (selector as (state: unknown) => unknown)({
          appDetail: {
            id: 'non-existent-id',
            name: 'Updated Name',
          },
        }),
      )

      const { rerender } = render(<AppNav />)
      rerender(<AppNav />)

      expect(screen.getByTestId('nav')).toBeInTheDocument()
    })

    it('should handle undefined isCurrentWorkspaceEditor', () => {
      vi.mocked(useAppContext).mockReturnValue({
        isCurrentWorkspaceEditor: undefined,
      } as unknown as ReturnType<typeof useAppContext>)

      render(<AppNav />)
      expect(screen.getByTestId('nav')).toBeInTheDocument()
    })
  })

  describe('Multiple Pages Handling', () => {
    it('should flatten multiple pages from infinite scroll', () => {
      vi.mocked(useInfiniteAppList).mockReturnValue({
        data: {
          pages: [
            { data: [mockAppData[0]] },
            { data: [mockAppData[1]] },
            { data: [mockAppData[2]] },
          ],
        },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInfiniteAppList>)

      render(<AppNav />)
      expect(screen.getByTestId('nav')).toBeInTheDocument()
    })
  })

  describe('openModal Function', () => {
    it('should handle invalid modal state gracefully', () => {
      render(<AppNav />)

      expect(screen.queryByTestId('create-app-modal')).not.toBeInTheDocument()
      expect(screen.queryByTestId('create-app-template-dialog')).not.toBeInTheDocument()
      expect(screen.queryByTestId('create-from-dsl-modal')).not.toBeInTheDocument()
    })
  })
})
