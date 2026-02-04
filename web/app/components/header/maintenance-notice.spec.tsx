import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { useLanguage } from '@/app/components/header/account-setting/model-provider-page/hooks'
import { NOTICE_I18N } from '@/i18n-config/language'
import MaintenanceNotice from './maintenance-notice'

vi.mock(
  '@/app/components/header/account-setting/model-provider-page/hooks',
  () => ({
    useLanguage: vi.fn(),
  }),
)

vi.mock('@/i18n-config/language', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    NOTICE_I18N: {
      title: {
        en_US: 'Notice Title',
        zh_Hans: '提示标题',
      },
      desc: {
        en_US: 'Notice Description',
        zh_Hans: '提示描述',
      },
      href: '#',
    },
  }
})

describe('MaintenanceNotice', () => {
  const windowOpenSpy = vi
    .spyOn(window, 'open')
    // eslint-disable-next-line ts/no-explicit-any
    .mockImplementation(() => null as any)

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(useLanguage).mockReturnValue('en_US')
    // Reset href for each test
    NOTICE_I18N.href = '#'
  })

  afterAll(() => {
    windowOpenSpy.mockRestore()
  })

  describe('Rendering', () => {
    it('should render localized content correctly (English)', () => {
      vi.mocked(useLanguage).mockReturnValue('en_US')
      render(<MaintenanceNotice />)
      expect(screen.getByText('Notice Title')).toBeInTheDocument()
      expect(screen.getByText('Notice Description')).toBeInTheDocument()
    })

    it('should render localized content correctly (Chinese)', () => {
      vi.mocked(useLanguage).mockReturnValue('zh_Hans')
      render(<MaintenanceNotice />)
      expect(screen.getByText('提示标题')).toBeInTheDocument()
      expect(screen.getByText('提示描述')).toBeInTheDocument()
    })

    it('should not render when hidden in localStorage', () => {
      localStorage.setItem('hide-maintenance-notice', '1')
      const { container } = render(<MaintenanceNotice />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('User Interactions', () => {
    it('should close the notice when X is clicked', () => {
      const { container } = render(<MaintenanceNotice />)
      expect(screen.getByText('Notice Title')).toBeInTheDocument()

      const closeIcon = container.querySelector('svg')!
      fireEvent.click(closeIcon)

      expect(screen.queryByText('Notice Title')).not.toBeInTheDocument()
      expect(localStorage.getItem('hide-maintenance-notice')).toBe('1')
    })

    it('should jump to notice when description is clicked and href is valid', () => {
      NOTICE_I18N.href = 'https://dify.ai/notice'
      render(<MaintenanceNotice />)

      const desc = screen.getByText('Notice Description')
      fireEvent.click(desc)

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://dify.ai/notice',
        '_blank',
      )
    })

    it('should not jump when href is #', () => {
      NOTICE_I18N.href = '#'
      render(<MaintenanceNotice />)

      const desc = screen.getByText('Notice Description')
      fireEvent.click(desc)

      expect(windowOpenSpy).not.toHaveBeenCalled()
    })

    it('should not jump when href is empty', () => {
      // eslint-disable-next-line ts/no-explicit-any
      (NOTICE_I18N as any).href = ''
      render(<MaintenanceNotice />)

      const desc = screen.getByText('Notice Description')
      fireEvent.click(desc)

      expect(windowOpenSpy).not.toHaveBeenCalled()
    })
  })
})
