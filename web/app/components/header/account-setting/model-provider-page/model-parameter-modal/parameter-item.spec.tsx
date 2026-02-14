import { fireEvent, render, screen } from '@testing-library/react'

import { vi } from 'vitest'
import ParameterItem from './parameter-item'

vi.mock('../hooks', () => ({
  useLanguage: () => 'en_US',
}))

vi.mock('@/app/components/base/radio', () => {
  const Radio = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  Radio.Group = ({ children, className }: { children: React.ReactNode, className: string }) => <div className={className}>{children}</div>
  return { default: Radio }
})

vi.mock('@/app/components/base/select', () => ({
  SimpleSelect: ({ onSelect, items }: { onSelect: (item: { value: string }) => void, items: { value: string, name: string }[] }) => (
    <select onChange={e => onSelect({ value: e.target.value })}>
      {items.map(item => (
        <option key={item.value} value={item.value}>{item.name}</option>
      ))}
    </select>
  ),
}))

vi.mock('@/app/components/base/slider', () => ({
  default: ({ value, onChange }: { value: number, onChange: (val: number) => void }) => (
    <input type="range" value={value} onChange={e => onChange(Number(e.target.value))} />
  ),
}))

vi.mock('@/app/components/base/switch', () => ({
  default: ({ onChange, defaultValue }: { onChange: (val: boolean) => void, defaultValue: boolean }) => (
    <button onClick={() => onChange(!defaultValue)}>Switch</button>
  ),
}))

vi.mock('@/app/components/base/tag-input', () => ({
  default: ({ onChange }: { onChange: (val: string[]) => void }) => (
    <input onChange={e => onChange(e.target.value.split(','))} />
  ),
}))

vi.mock('@/app/components/base/tooltip', () => ({
  default: ({ popupContent }: { popupContent: React.ReactNode }) => <div>{popupContent}</div>,
}))

describe('ParameterItem', () => {
  const baseProps = {
    parameterRule: {
      name: 'temp',
      label: { en_US: 'Temperature' },
      type: 'float',
      min: 0,
      max: 1,
      help: { en_US: 'Help text' },
    },
    value: 0.7,
    onChange: vi.fn(),
    onSwitch: vi.fn(),
  }

  it('should render float input with slider', () => {
    // @ts-expect-error Mock props
    render(<ParameterItem {...baseProps} />)

    expect(screen.getByText('Temperature')).toBeInTheDocument()
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '0.8' } })
    expect(baseProps.onChange).toHaveBeenCalledWith(0.8)
  })

  it('should render boolean radio', () => {
    const props = {
      ...baseProps,
      parameterRule: { ...baseProps.parameterRule, type: 'boolean' },
      value: true,
    }
    // @ts-expect-error Mock props
    render(<ParameterItem {...props} />)
    expect(screen.getByText('True')).toBeInTheDocument()
  })

  it('should render string input', () => {
    const props = {
      ...baseProps,
      parameterRule: { ...baseProps.parameterRule, type: 'string' },
      value: 'test',
    }
    // @ts-expect-error Mock props
    render(<ParameterItem {...props} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'new' } })
    expect(baseProps.onChange).toHaveBeenCalledWith('new')
  })

  it('should render select for string with options', () => {
    const props = {
      ...baseProps,
      parameterRule: {
        ...baseProps.parameterRule,
        type: 'string',
        options: ['opt1', 'opt2'],
      },
      value: 'opt1',
    }
    // @ts-expect-error Mock props
    render(<ParameterItem {...props} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'opt2' } })
    expect(baseProps.onChange).toHaveBeenCalledWith('opt2')
  })

  it('should handle switch toggle', () => {
    // @ts-expect-error Mock props
    render(<ParameterItem {...baseProps} />)
    fireEvent.click(screen.getByText('Switch'))
    expect(baseProps.onSwitch).toHaveBeenCalled()
  })
})
