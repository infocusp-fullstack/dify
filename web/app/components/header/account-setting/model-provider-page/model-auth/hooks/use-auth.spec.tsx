import type { Credential, CustomModel, ModelProvider } from '../../declarations'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { ModelTypeEnum } from '../../declarations'
import { useAuth } from './use-auth'

vi.mock('@/app/components/base/toast', () => ({
  useToastContext: vi.fn(() => ({
    notify: vi.fn(),
  })),
}))

vi.mock('../../hooks', () => ({
  useModelModalHandler: vi.fn(() => vi.fn()),
  useRefreshModel: vi.fn(() => ({
    handleRefreshModel: vi.fn(),
  })),
}))

vi.mock('@/service/use-models', () => ({
  useDeleteModel: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
}))

vi.mock('./use-auth-service', () => ({
  useAuthService: vi.fn(() => ({
    getDeleteCredentialService: vi.fn(() => vi.fn()),
    getActiveCredentialService: vi.fn(() => vi.fn()),
    getEditCredentialService: vi.fn(() => vi.fn()),
    getAddCredentialService: vi.fn(() => vi.fn()),
  })),
}))

const { useToastContext } = await import('@/app/components/base/toast')
const { useModelModalHandler, useRefreshModel } = await import('../../hooks')
const { useDeleteModel } = await import('@/service/use-models')
const { useAuthService } = await import('./use-auth-service')

describe('useAuth', () => {
  let queryClient: QueryClient
  const mockNotify = vi.fn()
  const mockHandleRefreshModel = vi.fn()
  const mockOpenModal = vi.fn()
  const mockDeleteCredentialService = vi.fn()
  const mockActiveCredentialService = vi.fn()
  const mockEditCredentialService = vi.fn()
  const mockAddCredentialService = vi.fn()
  const mockDeleteModelService = vi.fn()

  const mockProvider = { provider: 'openai' } as ModelProvider
  const mockCredential = { credential_id: 'cred-123', credential_name: 'Test Credential' } as Credential
  const mockModel = { model: 'gpt-4', model_type: ModelTypeEnum.textGeneration } as CustomModel

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    vi.mocked(useToastContext).mockReturnValue({ notify: mockNotify } as unknown as ReturnType<typeof useToastContext>)
    vi.mocked(useRefreshModel).mockReturnValue({ handleRefreshModel: mockHandleRefreshModel } as unknown as ReturnType<typeof useRefreshModel>)
    vi.mocked(useModelModalHandler).mockReturnValue(mockOpenModal as unknown as ReturnType<typeof useModelModalHandler>)
    vi.mocked(useDeleteModel).mockReturnValue({ mutateAsync: mockDeleteModelService } as unknown as ReturnType<typeof useDeleteModel>)
    vi.mocked(useAuthService).mockReturnValue({
      getDeleteCredentialService: vi.fn(() => mockDeleteCredentialService),
      getActiveCredentialService: vi.fn(() => mockActiveCredentialService),
      getEditCredentialService: vi.fn(() => mockEditCredentialService),
      getAddCredentialService: vi.fn(() => mockAddCredentialService),
    } as unknown as ReturnType<typeof useAuthService>)
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('manages delete confirmation state correctly', async () => {
    const { result } = renderHook(() => useAuth(mockProvider, 'predefined-model' as unknown as never), { wrapper })

    // Open/Close
    act(() => {
      result.current.openConfirmDelete(mockCredential, mockModel)
    })
    expect(result.current.deleteCredentialId).toBe('cred-123')
    act(() => {
      result.current.closeConfirmDelete()
    })
    expect(result.current.deleteCredentialId).toBeNull()

    // Confirm without pending
    await act(async () => {
      await result.current.handleConfirmDelete()
    })
    expect(mockDeleteCredentialService).not.toHaveBeenCalled()
  })

  it('handles credential activation with concurrency protection', async () => {
    mockActiveCredentialService.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)))
    const { result } = renderHook(() => useAuth(mockProvider, 'predefined-model' as unknown as never), { wrapper })

    act(() => {
      result.current.handleActiveCredential(mockCredential)
    })
    await act(async () => {
      await result.current.handleActiveCredential(mockCredential)
    })

    expect(mockActiveCredentialService).toHaveBeenCalledWith(expect.anything())
    expect(mockActiveCredentialService).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' })))
  })

  it('handles credential and model deletion successfully', async () => {
    mockDeleteCredentialService.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ result: 'success' }), 50)))
    mockDeleteModelService.mockResolvedValue({ result: 'success' })
    const onRemove = vi.fn()
    const { result } = renderHook(() => useAuth(mockProvider, 'predefined-model' as unknown as never, undefined, { onRemove }), { wrapper })

    // Concurrency check
    act(() => {
      result.current.openConfirmDelete(mockCredential)
    })
    act(() => {
      result.current.handleConfirmDelete()
    })
    await act(async () => {
      await result.current.handleConfirmDelete()
    })
    expect(mockDeleteCredentialService).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('cred-123'))

    // Model only delete
    act(() => {
      result.current.openConfirmDelete(undefined, mockModel)
    })
    await act(async () => {
      await result.current.handleConfirmDelete()
    })
    expect(mockDeleteModelService).toHaveBeenCalled()
  })

  it('handles saving credentials with concurrency protection', async () => {
    mockAddCredentialService.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ result: 'success' }), 50)))
    const { result } = renderHook(() => useAuth(mockProvider, 'predefined-model' as unknown as never), { wrapper })

    act(() => {
      result.current.handleSaveCredential({ api_key: 'test' })
    })
    await act(async () => {
      await result.current.handleSaveCredential({ api_key: 'test' })
    })

    expect(mockAddCredentialService).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' })))

    // Failure case (branch coverage)
    mockAddCredentialService.mockResolvedValueOnce({ result: 'error' })
    await act(async () => {
      await result.current.handleSaveCredential({ api_key: 'test2' })
    })
    expect(mockNotify).toHaveBeenCalledTimes(1) // Not called for error

    // Edit case
    mockEditCredentialService.mockResolvedValue({ result: 'success' })
    await act(async () => {
      await result.current.handleSaveCredential({ credential_id: '123' })
    })
    expect(mockEditCredentialService).toHaveBeenCalled()
  })

  it('opens modal with correct configuration', () => {
    const { result } = renderHook(() => useAuth(mockProvider, 'predefined-model' as unknown as never, undefined, { isModelCredential: true }), { wrapper })
    act(() => {
      result.current.handleOpenModal(mockCredential, mockModel)
    })
    expect(mockOpenModal).toHaveBeenCalledWith(mockProvider, 'predefined-model', undefined, expect.objectContaining({ isModelCredential: true }))
  })
})
