import { render } from '@testing-library/react'
import ProgressCircle from './progress-circle'

describe('ProgressCircle', () => {
  it('renders an SVG with default props', () => {
    const { container } = render(<ProgressCircle />)

    const svg = container.querySelector('svg')
    const circle = container.querySelector('circle')
    const path = container.querySelector('path')

    expect(svg).toBeInTheDocument()
    expect(circle).toBeInTheDocument()
    expect(path).toBeInTheDocument()
  })

  it('applies correct size and viewBox when size is provided', () => {
    const size = 24
    const strokeWidth = 2

    const { container } = render(
      <ProgressCircle size={size} circleStrokeWidth={strokeWidth} />,
    )

    const svg = container.querySelector('svg') as SVGElement

    expect(svg).toHaveAttribute('width', String(size + strokeWidth))
    expect(svg).toHaveAttribute('height', String(size + strokeWidth))
    expect(svg).toHaveAttribute(
      'viewBox',
      `0 0 ${size + strokeWidth} ${size + strokeWidth}`,
    )
  })

  it('applies custom stroke and fill classes to the circle', () => {
    const { container } = render(
      <ProgressCircle
        circleStrokeColor="stroke-red-500"
        circleFillColor="fill-red-100"
      />,
    )
    const circle = container.querySelector('circle')!
    expect(circle).toHaveClass('stroke-red-500')
    expect(circle).toHaveClass('fill-red-100')
  })

  it('applies custom sector fill color to the path', () => {
    const { container } = render(
      <ProgressCircle sectorFillColor="fill-blue-500" />,
    )
    const path = container.querySelector('path')!
    expect(path).toHaveClass('fill-blue-500')
  })

  it('uses large arc flag when percentage is greater than 50', () => {
    const { container } = render(<ProgressCircle percentage={75} />)
    const path = container.querySelector('path')!
    expect(path.getAttribute('d')).toContain('A')
    expect(path.getAttribute('d')).toContain('1')
  })

  it('uses small arc flag when percentage is 50 or less', () => {
    const { container } = render(<ProgressCircle percentage={25} />)
    const path = container.querySelector('path')!
    expect(path.getAttribute('d')).toContain('A')
    expect(path.getAttribute('d')).toContain('0')
  })
})
