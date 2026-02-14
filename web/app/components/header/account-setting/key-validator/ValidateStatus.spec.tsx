import { render, screen } from '@testing-library/react'
import {
  ValidatedErrorIcon,
  ValidatedErrorMessage,
  ValidatedSuccessIcon,
  ValidatingTip,
} from './ValidateStatus'

describe('ValidateStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show validating text while validation is running', () => {
    render(<ValidatingTip />)

    expect(screen.getByText('common.provider.validating')).toBeInTheDocument()
  })

  it('should show translated error text with the backend message', () => {
    render(<ValidatedErrorMessage errorMessage="invalid-token" />)

    expect(screen.getByText('common.provider.validatedErrorinvalid-token')).toBeInTheDocument()
  })

  it('should render an icon for success and error states', () => {
    const { rerender, container } = render(<ValidatedSuccessIcon />)

    expect(container.firstElementChild).toBeInTheDocument()

    rerender(<ValidatedErrorIcon />)

    expect(container.firstElementChild).toBeInTheDocument()
  })
})
