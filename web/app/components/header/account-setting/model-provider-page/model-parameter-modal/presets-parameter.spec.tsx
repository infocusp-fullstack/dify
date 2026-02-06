import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import PresetsParameter from './presets-parameter'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/dropdown', () => ({
  default: ({ renderTrigger, items, onSelect }: { renderTrigger: (open: boolean) => React.ReactNode, items: { value: number, text: string }[], onSelect: (item: { value: number }) => void }) => (
    <div>
      {renderTrigger(false)}
      {items.map(item => (
        <button key={item.value} onClick={() => onSelect(item)}>
          {item.text}
        </button>
      ))}
    </div>
  ),
}))

describe('PresetsParameter', () => {
  it('should render presets and handle selection', () => {
    const onSelect = vi.fn()
    render(<PresetsParameter onSelect={onSelect} />)

    expect(screen.getByText('modelProvider.loadPresets')).toBeInTheDocument()

    // Check if we can select an item
    const buttons = screen.getAllByRole('button')
    if (buttons.length > 1) {
      fireEvent.click(buttons[1]) // First one is trigger
      expect(onSelect).toHaveBeenCalled()
    }
  })
})
