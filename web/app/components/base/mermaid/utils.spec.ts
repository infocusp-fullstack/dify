import { cleanUpSvgCode, isMermaidCodeComplete, prepareMermaidCode, processSvgForTheme, sanitizeMermaidCode, svgToBase64, waitForDOMElement } from './utils'

describe('cleanUpSvgCode', () => {
  it('replaces old-style <br> tags with the new style', () => {
    const result = cleanUpSvgCode('<br>test<br>')
    expect(result).toEqual('<br/>test<br/>')
  })
})

describe('sanitizeMermaidCode', () => {
  it('handles null/non-string input', () => {
    // @ts-expect-error need to test null input
    expect(sanitizeMermaidCode(null)).toBe('')
    // @ts-expect-error need to test undefined input
    expect(sanitizeMermaidCode(undefined)).toBe('')
    // @ts-expect-error need to test non-string input
    expect(sanitizeMermaidCode(123)).toBe('')
  })

  it('removes click directives to prevent link/callback injection', () => {
    const unsafeProtocol = ['java', 'script:'].join('')
    const input = [
      'gantt',
      'title Demo',
      'section S1',
      'Task 1 :a1, 2020-01-01, 1d',
      `click A href "${unsafeProtocol}alert(location.href)"`,
      'click B call callback()',
    ].join('\n')

    const result = sanitizeMermaidCode(input)

    expect(result).toContain('gantt')
    expect(result).toContain('Task 1')
    expect(result).not.toContain('click A')
    expect(result).not.toContain('click B')
    expect(result).not.toContain(unsafeProtocol)
  })

  it('removes Mermaid init directives to prevent config overrides', () => {
    const input = [
      '%%{init: {"securityLevel":"loose"}}%%',
      'graph TD',
      'A-->B',
    ].join('\n')

    const result = sanitizeMermaidCode(input)

    expect(result).toEqual(['graph TD', 'A-->B'].join('\n'))
  })
})

describe('prepareMermaidCode', () => {
  it('handles null/non-string input', () => {
    // @ts-expect-error need to test null input
    expect(prepareMermaidCode(null, 'classic')).toBe('')
  })

  it('sanitizes click directives in flowcharts', () => {
    const unsafeProtocol = ['java', 'script:'].join('')
    const input = [
      'graph TD',
      'A[Click]-->B',
      `click A href "${unsafeProtocol}alert(1)"`,
    ].join('\n')

    const result = prepareMermaidCode(input, 'classic')

    expect(result).toContain('graph TD')
    expect(result).not.toContain('click ')
    expect(result).not.toContain(unsafeProtocol)
  })

  it('replaces <br> with newline', () => {
    const input = 'graph TD\nA[Node<br>Line]-->B'
    const result = prepareMermaidCode(input, 'classic')
    expect(result).toContain('Node\nLine')
  })

  it('handles handDrawn style specifically', () => {
    const input = 'flowchart TD\nstyle A fill:#fff\nlinkStyle 0 stroke:#000\nA-->B'
    const result = prepareMermaidCode(input, 'handDrawn')
    expect(result).toContain('graph TD')
    expect(result).not.toContain('style ')
    expect(result).not.toContain('linkStyle ')
    expect(result).toContain('A-->B')
  })

  it('adds TD fallback for handDrawn if missing', () => {
    const input = 'A-->B'
    const result = prepareMermaidCode(input, 'handDrawn')
    expect(result).toBe('graph TD\nA-->B')
  })
})

describe('svgToBase64', () => {
  it('returns empty string for empty input', async () => {
    expect(await svgToBase64('')).toBe('')
  })

  it('converts svg to base64', async () => {
    const svg = '<svg>test</svg>'
    const result = await svgToBase64(svg)
    expect(result).toContain('base64,')
    expect(result).toContain('image/svg+xml')
  })

  it('converts svg with xml declaration to base64', async () => {
    const svg = '<?xml version="1.0" encoding="UTF-8"?><svg>test</svg>'
    const result = await svgToBase64(svg)
    expect(result).toContain('base64,')
    expect(result).toContain('image/svg+xml')
  })

  it('handles errors in svgToBase64 gracefully', async () => {
    const encoderSpy = vi.spyOn(globalThis, 'TextEncoder').mockImplementation(() => ({
      encoding: 'utf-8',
      encode: () => { throw new Error('Encoder fail') },
      encodeInto: () => ({ read: 0, written: 0 }),
    } as unknown as TextEncoder))

    const result = await svgToBase64('<svg>fail</svg>')
    expect(result).toBe('')

    encoderSpy.mockRestore()
  })
})

describe('processSvgForTheme', () => {
  const themes = {
    light: {
      nodeColors: [{ bg: '#fefefe' }, { bg: '#eeeeee' }],
      connectionColor: '#cccccc',
    },
    dark: {
      nodeColors: [{ bg: '#121212' }, { bg: '#222222' }],
      connectionColor: '#333333',
    },
  }

  it('processes light theme node colors', () => {
    const svg = '<rect fill="#ffffff" class="node-1"/>'
    const result = processSvgForTheme(svg, false, false, themes)
    expect(result).toContain('fill="#fefefe"')
  })

  it('processes dark theme node colors and general elements', () => {
    const svg = '<rect fill="#ffffff" class="node-1"/><path stroke="#ffffff"/><rect fill="#ffffff" style="fill: #000000; stroke: #000000"/>'
    const result = processSvgForTheme(svg, true, false, themes)
    expect(result).toContain('fill="#121212"')
    expect(result).toContain('fill="#1e293b"') // Generic rect replacement
    expect(result).toContain('stroke="#333333"')
  })

  it('handles multiple node colors in cyclic manner', () => {
    const svg = '<rect fill="#ffffff" class="node-1"/><rect fill="#ffffff" class="node-2"/><rect fill="#ffffff" class="node-3"/>'
    const result = processSvgForTheme(svg, true, false, themes)
    // First color: #121212, Second color: #222222, Third color: #121212
    const fillMatches = result.match(/fill="#[a-fA-F0-9]{6}"/g)
    expect(fillMatches).toContain('fill="#121212"')
    expect(fillMatches).toContain('fill="#222222"')
    expect(fillMatches?.filter(f => f === 'fill="#121212"').length).toBe(2)
  })

  it('processes handDrawn style for dark theme', () => {
    const svg = '<path fill="#ffffff" stroke="#ffffff"/>'
    const result = processSvgForTheme(svg, true, true, themes)
    expect(result).toContain('fill="#121212"')
    expect(result).toContain('stroke="#333333"')
  })

  it('processes handDrawn style for light theme', () => {
    const svg = '<path fill="#ffffff" stroke="#ffffff"/>'
    const result = processSvgForTheme(svg, false, true, themes)
    expect(result).toContain('fill="#fefefe"')
    expect(result).toContain('stroke="#cccccc"')
  })
})

describe('isMermaidCodeComplete', () => {
  it('returns false for empty input', () => {
    expect(isMermaidCodeComplete('')).toBe(false)
    expect(isMermaidCodeComplete('   ')).toBe(false)
  })

  it('validates gantt charts', () => {
    expect(isMermaidCodeComplete('gantt\ntitle T\nsection S\nTask')).toBe(true)
    expect(isMermaidCodeComplete('gantt\ntitle T')).toBe(false)
  })

  it('validates mindmaps', () => {
    expect(isMermaidCodeComplete('mindmap\nroot')).toBe(true)
    expect(isMermaidCodeComplete('mindmap')).toBe(false)
  })

  it('validates other chart types', () => {
    expect(isMermaidCodeComplete('graph TD\nA-->B')).toBe(true)
    expect(isMermaidCodeComplete('pie title P\n"A": 10')).toBe(true)
    expect(isMermaidCodeComplete('invalid chart')).toBe(false)
  })

  it('detects common syntax errors', () => {
    expect(isMermaidCodeComplete('graph TD\nA--> undefined')).toBe(false)
    expect(isMermaidCodeComplete('graph TD\nA--> [object Object]')).toBe(false)
    expect(isMermaidCodeComplete('graph TD\nA-->')).toBe(false)
  })

  it('handles validation error gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const startsWithSpy = vi.spyOn(String.prototype, 'startsWith').mockImplementation(() => {
      throw new Error('Start fail')
    })

    expect(isMermaidCodeComplete('graph TD')).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith('Mermaid code validation error:', expect.any(Error))

    startsWithSpy.mockRestore()
    consoleSpy.mockRestore()
  })
})

describe('waitForDOMElement', () => {
  it('resolves when callback resolves', async () => {
    const cb = vi.fn().mockResolvedValue('success')
    const result = await waitForDOMElement(cb)
    expect(result).toBe('success')
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('retries on failure', async () => {
    const cb = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success')
    const result = await waitForDOMElement(cb, 3, 10)
    expect(result).toBe('success')
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('rejects after max attempts', async () => {
    const cb = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(waitForDOMElement(cb, 2, 10)).rejects.toThrow('fail')
    expect(cb).toHaveBeenCalledTimes(2)
  })
})
