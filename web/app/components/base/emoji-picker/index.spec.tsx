import { act, fireEvent, render, screen } from '@testing-library/react'
import EmojiPicker from './index'
import EmojiPickerInner from './Inner'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@emoji-mart/data', () => ({
  default: {
    categories: [
      {
        id: 'category1',
        name: 'Category 1',
        emojis: ['emoji1', 'emoji2'],
      },
    ],
  },
}))

vi.mock('emoji-mart', () => ({
  init: vi.fn(),
  SearchIndex: {
    search: vi.fn().mockResolvedValue([{ skins: [{ native: '🔍' }] }]),
  },
}))

vi.mock('@/utils/emoji', () => ({
  searchEmoji: vi.fn().mockResolvedValue(['🔍']),
}))

describe('EmojiPicker', () => {
  const mockOnSelect = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when isModal is false', () => {
    const { container } = render(
      <EmojiPicker isModal={false} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal when isModal is true', async () => {
    await act(async () => {
      render(
        <EmojiPicker isModal={true} />,
      )
    })
    expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument()
    expect(screen.getByText('iconPicker.cancel')).toBeInTheDocument()
    expect(screen.getByText('iconPicker.ok')).toBeInTheDocument()
  })

  it('OK button is disabled initially', async () => {
    await act(async () => {
      render(
        <EmojiPicker />,
      )
    })
    const okButton = screen.getByText('iconPicker.ok').closest('button')
    expect(okButton).toBeDisabled()
  })

  it('calls onSelect with selected emoji and background when OK is clicked', async () => {
    await act(async () => {
      render(
        <EmojiPicker onSelect={mockOnSelect} />,
      )
    })

    const emojiWrappers = document.querySelectorAll('.ring-components-input-border-hover')
    expect(emojiWrappers.length).toBeGreaterThan(0)
    await act(async () => {
      fireEvent.click(emojiWrappers[0])
    })

    const okButton = screen.getByText('iconPicker.ok')
    expect(okButton.closest('button')).not.toBeDisabled()

    await act(async () => {
      fireEvent.click(okButton)
    })

    expect(mockOnSelect).toHaveBeenCalledWith(expect.any(String), expect.any(String))
  })

  it('calls onClose when Cancel is clicked', async () => {
    await act(async () => {
      render(
        <EmojiPicker onClose={mockOnClose} />,
      )
    })

    const cancelButton = screen.getByText('iconPicker.cancel')
    await act(async () => {
      fireEvent.click(cancelButton)
    })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('applies custom className to modal wrapper', async () => {
    const customClass = 'custom-wrapper-class'
    await act(async () => {
      render(
        <EmojiPicker className={customClass} />,
      )
    })
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass(customClass)
  })
})

describe('EmojiPickerInner', () => {
  const mockOnSelect = vi.fn()

  it('renders categories and emojis', () => {
    render(<EmojiPickerInner onSelect={mockOnSelect} />)
    expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument()
    expect(document.querySelectorAll('.ring-components-input-border-hover').length).toBeGreaterThan(0)
  })

  it('handles search input', async () => {
    render(<EmojiPickerInner onSelect={mockOnSelect} />)
    const searchInput = screen.getByPlaceholderText('Search emojis...')

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'smile' } })
    })

    await screen.findByText('Search')
  })
})
