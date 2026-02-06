/* eslint-disable next/no-img-element */
import type { ImgHTMLAttributes } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import FileThumb from './index'

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

vi.mock('./image-render', () => ({
  __esModule: true,
  default: ({ sourceUrl, name }: { sourceUrl: string, name: string }) => (
    <div data-testid="image-render">
      <img src={sourceUrl} alt={name} />
    </div>
  ),
}))

vi.mock('../tooltip', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-mock">{children}</div>
  ),
}))

vi.mock('../file-uploader', () => ({
  FileTypeIcon: ({ type }: { type: string }) => (
    <div data-testid="file-type-icon">{type}</div>
  ),
}))

vi.mock('../file-uploader/utils', () => ({
  getFileAppearanceType: () => 'pdf',
}))

describe('FileThumb', () => {
  const mockImageFile = {
    name: 'test-image.jpg',
    mimeType: 'image/jpeg',
    extension: '.jpg',
    size: 1024,
    sourceUrl: 'https://example.com/test-image.jpg',
  }

  const mockNonImageFile = {
    name: 'test.pdf',
    mimeType: 'application/pdf',
    extension: '.pdf',
    size: 2048,
    sourceUrl: 'https://example.com/test.pdf',
  }

  it('renders image thumbnail correctly', () => {
    render(<FileThumb file={mockImageFile} />)

    const img = screen.getByAltText(mockImageFile.name)
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', mockImageFile.sourceUrl)
  })

  it('renders file type icon for non-image files', () => {
    render(<FileThumb file={mockNonImageFile} />)

    expect(screen.getByTestId('file-type-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('image-render')).not.toBeInTheDocument()
  })

  it('calls onClick with file when clicked', () => {
    const onClick = vi.fn()

    render(<FileThumb file={mockImageFile} onClick={onClick} />)

    const clickable = screen
      .getByTestId('tooltip-mock')
      .firstChild as HTMLElement

    fireEvent.click(clickable)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith(mockImageFile)
  })

  it('wraps content inside tooltip', () => {
    render(<FileThumb file={mockImageFile} />)

    expect(screen.getByTestId('tooltip-mock')).toBeInTheDocument()
  })
})
