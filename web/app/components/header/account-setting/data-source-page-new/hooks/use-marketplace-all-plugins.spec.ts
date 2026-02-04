import type { Plugin } from '@/app/components/plugins/types'
import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import {
  useMarketplacePlugins,
  useMarketplacePluginsByCollectionId,
} from '@/app/components/plugins/marketplace/hooks'
import { PluginCategoryEnum } from '@/app/components/plugins/types'

import { useMarketplaceAllPlugins } from './use-marketplace-all-plugins'

// Mock the marketplace hooks to control their return values in tests
vi.mock('@/app/components/plugins/marketplace/hooks', () => ({
  useMarketplacePlugins: vi.fn(),
  useMarketplacePluginsByCollectionId: vi.fn(),
}))

describe('useMarketplaceAllPlugins', () => {
  // Mock providers to be passed to the hook
  const mockProviders = [
    { plugin_id: 'plugin-1' },
    { plugin_id: 'plugin-2' },
  ]

  // Mock data for pinned/collection plugins
  const mockCollectionPlugins = [
    { plugin_id: 'plugin-3', type: 'plugin', install_count: 10 },
    { plugin_id: 'plugin-1', type: 'plugin', install_count: 20 }, // Should be excluded because it's already in providers
  ] as unknown as Plugin[]

  // Mock data for general marketplace plugins
  const mockPlugins = [
    { plugin_id: 'plugin-4', type: 'plugin', install_count: 5 },
    { plugin_id: 'plugin-3', type: 'plugin', install_count: 10 }, // Duplicate of what's in collection, should be filtered
    { plugin_id: 'plugin-5', type: 'bundle', install_count: 1 }, // Bundle type, should be skipped
  ] as unknown as Plugin[]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return combined and filtered plugins list correctly', () => {
    // Mock the collection hook return value
    vi.mocked(useMarketplacePluginsByCollectionId).mockReturnValue({
      plugins: mockCollectionPlugins,
      isLoading: false,
      isSuccess: true,
    })

    // Mock the plugins hook return value using unknown bridge to satisfy the complex return type
    vi.mocked(useMarketplacePlugins).mockReturnValue({
      plugins: mockPlugins,
      queryPlugins: vi.fn(),
      queryPluginsWithDebounced: vi.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useMarketplacePlugins>)

    const { result } = renderHook(() => useMarketplaceAllPlugins(mockProviders, ''))

    // Logic verification:
    // 1. plugin-3 from collection should be included (not in providers)
    // 2. plugin-1 from collection should be excluded (is in providers)
    // 3. plugin-4 from plugins should be included (not bundle, not in allPlugins yet)
    // 4. plugin-3 from plugins should be skipped (already added from collection)
    // 5. plugin-5 from plugins should be skipped (it is a bundle)
    expect(result.current.plugins).toHaveLength(2)
    expect(result.current.plugins.map((p: { plugin_id: string }) => p.plugin_id)).toEqual(['plugin-3', 'plugin-4'])
    expect(result.current.isLoading).toBe(false)
  })

  it('should query plugins with debounce when searchText is provided', () => {
    const mockQueryPluginsWithDebounced = vi.fn()
    vi.mocked(useMarketplacePluginsByCollectionId).mockReturnValue({
      plugins: [],
      isLoading: false,
      isSuccess: true,
    })

    vi.mocked(useMarketplacePlugins).mockReturnValue({
      plugins: [],
      queryPlugins: vi.fn(),
      queryPluginsWithDebounced: mockQueryPluginsWithDebounced,
      isLoading: false,
    } as unknown as ReturnType<typeof useMarketplacePlugins>)

    renderHook(() => useMarketplaceAllPlugins(mockProviders, 'search query'))

    // Verify the debounced query is called with correct parameters
    expect(mockQueryPluginsWithDebounced).toHaveBeenCalledWith({
      query: 'search query',
      category: PluginCategoryEnum.datasource,
      exclude: ['plugin-1', 'plugin-2'],
      type: 'plugin',
      sort_by: 'install_count',
      sort_order: 'DESC',
    })
  })

  it('should query plugins immediately when searchText is empty', () => {
    const mockQueryPlugins = vi.fn()
    vi.mocked(useMarketplacePluginsByCollectionId).mockReturnValue({
      plugins: [],
      isLoading: false,
      isSuccess: true,
    })

    vi.mocked(useMarketplacePlugins).mockReturnValue({
      plugins: [],
      queryPlugins: mockQueryPlugins,
      queryPluginsWithDebounced: vi.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useMarketplacePlugins>)

    renderHook(() => useMarketplaceAllPlugins(mockProviders, ''))

    // Verify the normal query is called with correct parameters for initial load
    expect(mockQueryPlugins).toHaveBeenCalledWith({
      query: '',
      category: PluginCategoryEnum.datasource,
      type: 'plugin',
      page_size: 1000,
      exclude: ['plugin-1', 'plugin-2'],
      sort_by: 'install_count',
      sort_order: 'DESC',
    })
  })

  it('should reflect loading state when either hook is loading', () => {
    // Case 1: Collection hook is loading
    vi.mocked(useMarketplacePluginsByCollectionId).mockReturnValue({
      plugins: [],
      isLoading: true,
      isSuccess: true,
    })
    vi.mocked(useMarketplacePlugins).mockReturnValue({
      plugins: [],
      queryPlugins: vi.fn(),
      queryPluginsWithDebounced: vi.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useMarketplacePlugins>)

    const { result, rerender } = renderHook(() => useMarketplaceAllPlugins(mockProviders, ''))
    expect(result.current.isLoading).toBe(true)

    // Case 2: Plugins hook is loading
    vi.mocked(useMarketplacePluginsByCollectionId).mockReturnValue({
      plugins: [],
      isLoading: false,
      isSuccess: true,
    })
    vi.mocked(useMarketplacePlugins).mockReturnValue({
      plugins: [],
      queryPlugins: vi.fn(),
      queryPluginsWithDebounced: vi.fn(),
      isLoading: true,
    } as unknown as ReturnType<typeof useMarketplacePlugins>)

    rerender()
    expect(result.current.isLoading).toBe(true)
  })
})
