import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import {
  useInvalidDataSourceAuth,
  useInvalidDataSourceListAuth,
  useInvalidDefaultDataSourceListAuth,
} from '@/service/use-datasource'

import { useInvalidDataSourceList } from '@/service/use-pipeline'
import { useDataSourceAuthUpdate } from './use-data-source-auth-update'

// Mock the dependent hooks
vi.mock('@/service/use-datasource', () => ({
  useInvalidDataSourceListAuth: vi.fn(),
  useInvalidDefaultDataSourceListAuth: vi.fn(),
  useInvalidDataSourceAuth: vi.fn(),
}))

vi.mock('@/service/use-pipeline', () => ({
  useInvalidDataSourceList: vi.fn(),
}))

describe('useDataSourceAuthUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call invalidation functions when handleAuthUpdate is called', () => {
    // Define mock functions with explicit types
    const mockInvalidateDataSourceListAuth = vi.fn<() => void>()
    const mockInvalidDefaultDataSourceListAuth = vi.fn<() => void>()
    const mockInvalidateDataSourceAuth = vi.fn<() => void>()
    const mockInvalidateDataSourceList = vi.fn<() => void>()

    // Mock the return values of the hooks
    vi.mocked(useInvalidDataSourceListAuth).mockReturnValue(mockInvalidateDataSourceListAuth)
    vi.mocked(useInvalidDefaultDataSourceListAuth).mockReturnValue(mockInvalidDefaultDataSourceListAuth)
    vi.mocked(useInvalidDataSourceAuth).mockReturnValue(mockInvalidateDataSourceAuth)
    vi.mocked(useInvalidDataSourceList).mockReturnValue(mockInvalidateDataSourceList)

    const pluginId = 'test-plugin'
    const provider = 'test-provider'

    const { result } = renderHook(() => useDataSourceAuthUpdate({ pluginId, provider }))

    result.current.handleAuthUpdate()

    // Verify useInvalidDataSourceAuth was called with expected arguments
    expect(useInvalidDataSourceAuth).toHaveBeenCalledWith({
      pluginId,
      provider,
    })

    // Verify all invalidation functions were called
    expect(mockInvalidateDataSourceListAuth).toHaveBeenCalled()
    expect(mockInvalidDefaultDataSourceListAuth).toHaveBeenCalled()
    expect(mockInvalidateDataSourceList).toHaveBeenCalled()
    expect(mockInvalidateDataSourceAuth).toHaveBeenCalled()
  })
})
