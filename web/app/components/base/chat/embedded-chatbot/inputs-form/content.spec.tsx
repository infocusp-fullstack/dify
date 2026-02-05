import { fireEvent, render, screen } from '@testing-library/react'
import { InputVarType } from '@/app/components/workflow/types'
import InputsFormContent from './content'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/app/components/base/file-uploader', () => ({
  FileUploaderInAttachmentWrapper: ({ value, onChange }: { value: unknown[], onChange: (files: unknown[]) => void }) => (
    <div data-testid="file-uploader" data-value={JSON.stringify(value)} onClick={() => onChange(['new-file'])}>
      FileUploader
    </div>
  ),
}))

vi.mock('@/app/components/base/input', () => ({
  default: ({ value, onChange, placeholder, type }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, type?: string }) => (
    <input
      data-testid="input"
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
}))

vi.mock('@/app/components/base/select', () => ({
  PortalSelect: ({ value, onSelect, placeholder }: { value: string, onSelect: (item: { value: string }) => void, placeholder?: string }) => (
    <div data-testid="select" onClick={() => onSelect({ value: 'new-option' })}>
      {value || placeholder}
    </div>
  ),
}))

vi.mock('@/app/components/base/textarea', () => ({
  default: ({ value, onChange, placeholder }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, placeholder?: string }) => (
    <textarea
      data-testid="textarea"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
}))

vi.mock('@/app/components/workflow/nodes/_base/components/before-run-form/bool-input', () => ({
  default: ({ name, value, onChange }: { name: string, value: boolean, onChange: (v: boolean) => void }) => (
    <div data-testid="bool-input" onClick={() => onChange(!value)}>
      {name}
      :
      {String(value)}
    </div>
  ),
}))

vi.mock('@/app/components/workflow/nodes/_base/components/editor/code-editor', () => ({
  default: ({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder?: React.ReactNode }) => (
    <div data-testid="code-editor" onClick={() => onChange('new-code')}>
      {value || (typeof placeholder === 'string' ? placeholder : 'placeholder')}
    </div>
  ),
}))

type MockForm = {
  variable: string
  label: string
  type: InputVarType
  required?: boolean
  hide?: boolean
  options?: string[]
  json_schema?: string
  max_length?: number
}

const mockContext = {
  appParams: { system_parameters: {} },
  inputsForms: [] as MockForm[],
  currentConversationId: '',
  currentConversationInputs: {} as Record<string, unknown>,
  setCurrentConversationInputs: vi.fn(),
  newConversationInputs: {} as Record<string, unknown>,
  newConversationInputsRef: { current: {} } as { current: Record<string, unknown> },
  handleNewConversationInputsChange: vi.fn(),
}

const useEmbeddedChatbotContextMock = vi.fn(() => mockContext)
vi.mock('../context', () => ({
  useEmbeddedChatbotContext: () => useEmbeddedChatbotContextMock(),
}))

describe('InputsFormContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockContext })
  })

  it('should render nothing when no forms are provided', () => {
    const { container } = render(<InputsFormContent />)
    expect(container.firstChild).toBeEmptyDOMElement()
  })

  it('should render text input and trigger context updates on change', () => {
    const forms = [{ variable: 'var1', label: 'Label 1', type: InputVarType.textInput, required: true }]
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockContext, inputsForms: forms })

    render(<InputsFormContent />)
    expect(screen.getByText('Label 1')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('input'), { target: { value: 'new value' } })

    expect(mockContext.setCurrentConversationInputs).toHaveBeenCalled()
    expect(mockContext.handleNewConversationInputsChange).toHaveBeenCalled()
  })

  it('should render number input with correct type attribute', () => {
    const forms = [{ variable: 'var1', label: 'Label 1', type: InputVarType.number }]
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockContext, inputsForms: forms })

    render(<InputsFormContent />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'number')
    fireEvent.change(input, { target: { value: '123' } })
    expect(mockContext.setCurrentConversationInputs).toHaveBeenCalled()
  })

  it('should render textarea for paragraph types', () => {
    const forms = [{ variable: 'var1', label: 'Label 1', type: InputVarType.paragraph }]
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockContext, inputsForms: forms })

    render(<InputsFormContent />)
    fireEvent.change(screen.getByTestId('textarea'), { target: { value: 'long text' } })
    expect(mockContext.setCurrentConversationInputs).toHaveBeenCalled()
  })

  it('should handle boolean checkbox toggles', () => {
    const forms = [{ variable: 'var1', label: 'Label 1', type: InputVarType.checkbox }]
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockContext, inputsForms: forms })

    render(<InputsFormContent />)
    fireEvent.click(screen.getByTestId('bool-input'))
    expect(mockContext.setCurrentConversationInputs).toHaveBeenCalled()
  })

  it('should handle selection from PortalSelect', () => {
    const forms = [{ variable: 'var1', label: 'Label 1', type: InputVarType.select, options: ['opt1', 'opt2'] }]
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockContext, inputsForms: forms })

    render(<InputsFormContent />)
    fireEvent.click(screen.getByTestId('select'))
    expect(mockContext.setCurrentConversationInputs).toHaveBeenCalled()
  })

  it('should render file uploader and display existing values', () => {
    const forms = [{ variable: 'var1', label: 'Label 1', type: InputVarType.singleFile }]
    useEmbeddedChatbotContextMock.mockReturnValue({
      ...mockContext,
      inputsForms: forms,
      currentConversationInputs: { var1: 'existing-file' },
      currentConversationId: 'conv1',
    })

    render(<InputsFormContent />)
    const uploader = screen.getByTestId('file-uploader')
    expect(uploader).toHaveAttribute('data-value', JSON.stringify(['existing-file']))
    fireEvent.click(uploader)
    expect(mockContext.setCurrentConversationInputs).toHaveBeenCalled()
  })

  it('should handle multi-file uploads', () => {
    const forms = [{ variable: 'var1', label: 'Label 1', type: InputVarType.multiFiles, max_length: 5 }]
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockContext, inputsForms: forms })

    render(<InputsFormContent />)
    fireEvent.click(screen.getByTestId('file-uploader'))
    expect(mockContext.setCurrentConversationInputs).toHaveBeenCalled()
  })

  it('should render JSON code editor', () => {
    const forms = [{ variable: 'var1', label: 'Label 1', type: InputVarType.jsonObject, json_schema: '{}' }]
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockContext, inputsForms: forms })

    render(<InputsFormContent />)
    fireEvent.click(screen.getByTestId('code-editor'))
    expect(mockContext.setCurrentConversationInputs).toHaveBeenCalled()
  })

  it('should show optional label only when field is not required', () => {
    const forms = [{ variable: 'var1', label: 'Label 1', type: InputVarType.textInput, required: false }]
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockContext, inputsForms: forms })

    render(<InputsFormContent />)
    expect(screen.getByText('panel.optional')).toBeInTheDocument()
  })

  it('should conditionally render form tip based on showTip prop', () => {
    const { rerender } = render(<InputsFormContent showTip />)
    expect(screen.getByText('chat.chatFormTip')).toBeInTheDocument()

    rerender(<InputsFormContent showTip={false} />)
    expect(screen.queryByText('chat.chatFormTip')).not.toBeInTheDocument()
  })

  it('should prioritize currentConversationInputs when an ID is present', () => {
    const forms = [{ variable: 'var1', label: 'Label 1', type: InputVarType.textInput }]
    useEmbeddedChatbotContextMock.mockReturnValue({
      ...mockContext,
      inputsForms: forms,
      currentConversationId: 'conv1',
      currentConversationInputs: { var1: 'active-value' },
    })

    render(<InputsFormContent />)
    expect((screen.getByTestId('input') as HTMLInputElement).value).toBe('active-value')
  })

  it('should fall back to newConversationInputs when no conversation ID is present', () => {
    const forms = [{ variable: 'var1', label: 'Label 1', type: InputVarType.textInput }]
    useEmbeddedChatbotContextMock.mockReturnValue({
      ...mockContext,
      inputsForms: forms,
      currentConversationId: '',
      newConversationInputs: { var1: 'draft-value' },
    })

    render(<InputsFormContent />)
    expect((screen.getByTestId('input') as HTMLInputElement).value).toBe('draft-value')
  })

  it('should filter out hidden form fields', () => {
    const forms = [
      { variable: 'var1', label: 'Visible', type: InputVarType.textInput, hide: false },
      { variable: 'var2', label: 'Hidden', type: InputVarType.textInput, hide: true },
    ]
    useEmbeddedChatbotContextMock.mockReturnValue({ ...mockContext, inputsForms: forms })

    render(<InputsFormContent />)
    expect(screen.getByText('Visible')).toBeInTheDocument()
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })
})
