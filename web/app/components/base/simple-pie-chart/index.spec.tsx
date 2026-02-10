import { render, screen } from '@testing-library/react'
import SimplePieChart from '.'

// Mock echarts-for-react
vi.mock('echarts-for-react', () => ({
  default: ({ option, style, className }: { option: unknown, style?: React.CSSProperties, className?: string }) => (
    <div data-testid="mock-echarts" data-option={JSON.stringify(option)} style={style} className={className} />
  ),
}))

describe('SimplePieChart', () => {
  it('renders correctly with default props', () => {
    render(<SimplePieChart />)
    const chart = screen.getByTestId('mock-echarts')
    expect(chart).toBeInTheDocument()

    const option = JSON.parse(chart.getAttribute('data-option')!)
    expect(option.series[1].data[0].value).toBe(80) // default percentage
    expect(option.series[1].data[0].itemStyle.color).toBe('#fdb022') // default fill
    expect(option.series[0].data[0].itemStyle.color).toBe('#f79009') // default stroke
  })

  it('applies custom props correctly', () => {
    render(
      <SimplePieChart
        percentage={50}
        fill="red"
        stroke="blue"
        size={24}
        className="custom-chart"
      />,
    )
    const chart = screen.getByTestId('mock-echarts')
    expect(chart).toHaveClass('custom-chart')
    expect(chart).toHaveStyle({ width: '24px', height: '24px' })

    const option = JSON.parse(chart.getAttribute('data-option')!)
    expect(option.series[1].data[0].value).toBe(50)
    expect(option.series[1].data[0].itemStyle.color).toBe('red')
    expect(option.series[0].data[0].itemStyle.color).toBe('blue')
  })

  it('handles custom animation duration', () => {
    render(<SimplePieChart animationDuration={1000} />)
    const chart = screen.getByTestId('mock-echarts')
    const option = JSON.parse(chart.getAttribute('data-option')!)
    expect(option.series[1].animationDuration).toBe(1000)
  })

  it('uses default animation duration when not provided', () => {
    render(<SimplePieChart />)
    const chart = screen.getByTestId('mock-echarts')
    const option = JSON.parse(chart.getAttribute('data-option')!)
    expect(option.series[1].animationDuration).toBe(600)
  })
})
