/* eslint-disable next/no-img-element */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import mermaid from 'mermaid'
import Flowchart from './index'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg id="mermaid-chart">test-svg</svg>' }),
    mermaidAPI: {
      render: vi.fn().mockResolvedValue({ svg: '<svg id="mermaid-chart">test-svg-api</svg>' }),
    },
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    svgToBase64: vi.fn().mockResolvedValue('data:image/svg+xml;base64,dGVzdC1zdmc='),
    waitForDOMElement: vi.fn((cb: () => Promise<unknown>) => cb()),
  }
})

vi.mock('@/app/components/base/chat/chat/loading-anim', () => ({
  default: () => <div data-testid="loading-anim" />,
}))

vi.mock('@/app/components/base/image-uploader/image-preview', () => ({
  default: ({ url, onCancel }: { url: string, onCancel: () => void }) => (
    <div data-testid="image-preview">
      <img src={url} alt="preview" />
      <button onClick={onCancel}>Close</button>
    </div>
  ),
}))

describe('Mermaid Flowchart Component', () => {
  const mockCode = 'graph TD\n  A-->B'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mermaid.initialize).mockImplementation(() => {})
  })

  it('initializes mermaid on mount', async () => {
    await act(async () => {
      render(<Flowchart PrimitiveCode={mockCode} />)
    })
    expect(mermaid.initialize).toHaveBeenCalled()
  })

  it('renders mermaid chart after debounce', async () => {
    await act(async () => {
      render(<Flowchart PrimitiveCode={mockCode} />)
    })

    await waitFor(() => {
      expect(screen.getByText('test-svg')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.queryByTestId('loading-anim')).not.toBeInTheDocument()
  })

  it('handles too short code by not rendering', async () => {
    const shortCode = 'graph'
    await act(async () => {
      render(<Flowchart PrimitiveCode={shortCode} />)
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
    })

    expect(screen.queryByTestId('loading-anim')).not.toBeInTheDocument()
    expect(mermaid.render).not.toHaveBeenCalled()
  })

  it('switches between classic and handDrawn looks', async () => {
    await act(async () => {
      render(<Flowchart PrimitiveCode={mockCode} />)
    })

    await waitFor(() => screen.getByText('test-svg'), { timeout: 3000 })

    const handDrawnBtn = screen.getByText('mermaid.handDrawn')
    await act(async () => {
      fireEvent.click(handDrawnBtn)
    })

    await waitFor(() => {
      expect(screen.getByText('test-svg-api')).toBeInTheDocument()
    }, { timeout: 3000 })

    const classicBtn = screen.getByText('mermaid.classic')
    await act(async () => {
      fireEvent.click(classicBtn)
    })

    await waitFor(() => {
      expect(screen.getByText('test-svg')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('toggles theme manually', async () => {
    await act(async () => {
      render(<Flowchart PrimitiveCode={mockCode} theme="light" />)
    })

    await waitFor(() => screen.getByText('test-svg'), { timeout: 3000 })

    const toggleBtn = screen.getByRole('button')
    await act(async () => {
      fireEvent.click(toggleBtn)
    })

    await waitFor(() => {
      expect(mermaid.initialize).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('handles rendering errors gracefully', async () => {
    const errorMsg = 'Syntax error'
    vi.mocked(mermaid.render).mockRejectedValueOnce(new Error(errorMsg))

    await act(async () => {
      render(<Flowchart PrimitiveCode={mockCode} />)
    })

    await waitFor(() => {
      expect(screen.getByText(`Rendering failed: ${errorMsg}`)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('opens image preview when clicking the chart', async () => {
    await act(async () => {
      render(<Flowchart PrimitiveCode={mockCode} />)
    })

    await waitFor(() => screen.getByText('test-svg'), { timeout: 3000 })

    const chartDiv = screen.getByText('test-svg').closest('.mermaid')
    await act(async () => {
      fireEvent.click(chartDiv!)
    })

    await waitFor(() => {
      expect(screen.getByTestId('image-preview')).toBeInTheDocument()
    }, { timeout: 3000 })

    const closeBtn = screen.getByText('Close')
    await act(async () => {
      fireEvent.click(closeBtn)
    })
    expect(screen.queryByTestId('image-preview')).not.toBeInTheDocument()
  })

  it('renders gantt charts with specific formatting', async () => {
    const ganttCode = 'gantt\ntitle T\nTask :after task1, after task2'
    await act(async () => {
      render(<Flowchart PrimitiveCode={ganttCode} />)
    })

    await waitFor(() => {
      expect(screen.getByText('test-svg')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('uses cached diagram if available', async () => {
    const { rerender } = render(<Flowchart PrimitiveCode={mockCode} />)

    await waitFor(() => screen.getByText('test-svg'), { timeout: 3000 })

    vi.mocked(mermaid.render).mockClear()

    await act(async () => {
      rerender(<Flowchart PrimitiveCode={mockCode} />)
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
    })
    expect(mermaid.render).not.toHaveBeenCalled()
  })

  it('handles invalid mermaid code completion', async () => {
    const invalidCode = 'graph TD\nA -->' // Incomplete
    await act(async () => {
      render(<Flowchart PrimitiveCode={invalidCode} />)
    })

    await waitFor(() => {
      expect(screen.getByText('Diagram code is not complete or invalid.')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('renders mindmap and sequenceDiagram charts', async () => {
    const mindmapCode = 'mindmap\n  root\n    topic1'
    await act(async () => {
      render(<Flowchart PrimitiveCode={mindmapCode} />)
    })
    await waitFor(() => {
      expect(screen.getByText('test-svg')).toBeInTheDocument()
    }, { timeout: 3000 })

    const sequenceCode = 'sequenceDiagram\n  A->>B: Hello'
    await act(async () => {
      render(<Flowchart PrimitiveCode={sequenceCode} />)
    })
    await waitFor(() => {
      expect(screen.getByText('test-svg')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('handles dark theme configuration', async () => {
    await act(async () => {
      render(<Flowchart PrimitiveCode={mockCode} theme="dark" />)
    })
    await waitFor(() => {
      expect(screen.getByText('test-svg')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('handles unmount cleanup', async () => {
    const { unmount } = render(<Flowchart PrimitiveCode={mockCode} />)
    await act(async () => {
      unmount()
    })
  })
})

describe('Mermaid Flowchart Component Module Isolation', () => {
  const mockCode = 'graph TD\n  A-->B'

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.mocked(mermaid.initialize).mockImplementation(() => {})
  })

  it('handles initialization failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: FlowchartFresh } = await import('./index')

    vi.mocked(mermaid.initialize).mockImplementationOnce(() => {
      throw new Error('Init fail')
    })

    await act(async () => {
      render(<FlowchartFresh PrimitiveCode={mockCode} />)
    })

    expect(consoleSpy).toHaveBeenCalledWith('Mermaid initialization error:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('handles mermaidAPI missing fallback', async () => {
    const originalMermaidAPI = mermaid.mermaidAPI
    // @ts-expect-error need to set undefined for testing
    mermaid.mermaidAPI = undefined

    const { default: FlowchartFresh } = await import('./index')

    await act(async () => {
      render(<FlowchartFresh PrimitiveCode={mockCode} />)
    })

    await waitFor(() => screen.getByText('mermaid.handDrawn'), { timeout: 3000 })
    const handDrawnBtn = screen.getByText('mermaid.handDrawn')
    await act(async () => {
      fireEvent.click(handDrawnBtn)
    })

    await waitFor(() => {
      expect(screen.getByText('test-svg')).toBeInTheDocument()
    }, { timeout: 3000 })

    mermaid.mermaidAPI = originalMermaidAPI
  })

  it('handles configuration failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: FlowchartFresh } = await import('./index')

    await act(async () => {
      render(<FlowchartFresh PrimitiveCode={mockCode} />)
    })

    vi.mocked(mermaid.initialize).mockImplementation(() => {
      throw new Error('Config fail')
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
    })

    expect(consoleSpy).toHaveBeenCalledWith('Config error:', expect.any(Error))
    consoleSpy.mockRestore()
  })
})
