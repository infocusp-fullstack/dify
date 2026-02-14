import type { ChatItem, ChatItemInTree } from '../types'
import { get } from 'es-toolkit/compat'
import {
  buildChatItemTree,
  getLastAnswer,
  getProcessedInputsFromUrlParams,
  getProcessedSystemVariablesFromUrlParams,
  getProcessedUserVariablesFromUrlParams,
  getRawInputsFromUrlParams,
  getRawUserVariablesFromUrlParams,
  getThreadMessages,
  isValidGeneratedAnswer,
} from '../utils'
import branchedTestMessages from './branchedTestMessages.json'
import legacyTestMessages from './legacyTestMessages.json'
import mixedTestMessages from './mixedTestMessages.json'
import multiRootNodesMessages from './multiRootNodesMessages.json'
import multiRootNodesWithLegacyTestMessages from './multiRootNodesWithLegacyTestMessages.json'
import partialMessages from './partialMessages.json'
import realWorldMessages from './realWorldMessages.json'
// Mock window.location.search and DecompressionStream
const mockUrlParams = (params: Record<string, string>) => {
  const searchParams = new URLSearchParams(params)
  Object.defineProperty(window, 'location', {
    value: {
      search: `?${searchParams.toString()}`,
    },
    writable: true,
  })
}
function visitNode(
  tree: ChatItemInTree | ChatItemInTree[],
  path: string,
): ChatItemInTree {
  return get(tree, path)
}
const createTestAnswer = (overrides?: Partial<ChatItem>): ChatItem => ({
  id: 'answer-id',
  content: 'answer content',
  isAnswer: true,
  ...overrides,
})
const createTestChatItem = (overrides?: Partial<ChatItem>): ChatItem => ({
  id: 'test-id',
  content: 'test content',
  isAnswer: false,
  ...overrides,
})
describe('build chat item tree and get thread messages', () => {
  const tree1 = buildChatItemTree(branchedTestMessages as ChatItemInTree[])

  it('should build chat item tree1', () => {
    const a1 = visitNode(tree1, '0.children.0')
    expect(a1.id).toBe('1')
    expect(a1.children).toHaveLength(2)

    const a2 = visitNode(a1, 'children.0.children.0')
    expect(a2.id).toBe('2')
    expect(a2.siblingIndex).toBe(0)

    const a3 = visitNode(a2, 'children.0.children.0')
    expect(a3.id).toBe('3')

    const a4 = visitNode(a1, 'children.1.children.0')
    expect(a4.id).toBe('4')
    expect(a4.siblingIndex).toBe(1)
  })

  it('should get thread messages from tree1, using the last message as the target', () => {
    const threadChatItems1_1 = getThreadMessages(tree1)
    expect(threadChatItems1_1).toHaveLength(4)

    const q1 = visitNode(threadChatItems1_1, '0')
    const a1 = visitNode(threadChatItems1_1, '1')
    const q4 = visitNode(threadChatItems1_1, '2')
    const a4 = visitNode(threadChatItems1_1, '3')

    expect(q1.id).toBe('question-1')
    expect(a1.id).toBe('1')
    expect(q4.id).toBe('question-4')
    expect(a4.id).toBe('4')

    expect(a4.siblingCount).toBe(2)
    expect(a4.siblingIndex).toBe(1)
  })

  it('should get thread messages from tree1, using the message with id 3 as the target', () => {
    const threadChatItems1_2 = getThreadMessages(tree1, '3')
    expect(threadChatItems1_2).toHaveLength(6)

    const q1 = visitNode(threadChatItems1_2, '0')
    const a1 = visitNode(threadChatItems1_2, '1')
    const q2 = visitNode(threadChatItems1_2, '2')
    const a2 = visitNode(threadChatItems1_2, '3')
    const q3 = visitNode(threadChatItems1_2, '4')
    const a3 = visitNode(threadChatItems1_2, '5')

    expect(q1.id).toBe('question-1')
    expect(a1.id).toBe('1')
    expect(q2.id).toBe('question-2')
    expect(a2.id).toBe('2')
    expect(q3.id).toBe('question-3')
    expect(a3.id).toBe('3')

    expect(a2.siblingCount).toBe(2)
    expect(a2.siblingIndex).toBe(0)
  })

  const tree2 = buildChatItemTree(legacyTestMessages as ChatItemInTree[])
  it('should work with legacy chat items', () => {
    expect(tree2).toHaveLength(1)
    const q1 = visitNode(tree2, '0')
    const a1 = visitNode(q1, 'children.0')
    const q2 = visitNode(a1, 'children.0')
    const a2 = visitNode(q2, 'children.0')
    const q3 = visitNode(a2, 'children.0')
    const a3 = visitNode(q3, 'children.0')
    const q4 = visitNode(a3, 'children.0')
    const a4 = visitNode(q4, 'children.0')

    expect(q1.id).toBe('question-1')
    expect(a1.id).toBe('1')
    expect(q2.id).toBe('question-2')
    expect(a2.id).toBe('2')
    expect(q3.id).toBe('question-3')
    expect(a3.id).toBe('3')
    expect(q4.id).toBe('question-4')
    expect(a4.id).toBe('4')
  })

  it('should get thread messages from tree2, using the last message as the target', () => {
    const threadMessages2 = getThreadMessages(tree2)
    expect(threadMessages2).toHaveLength(8)

    const q1 = visitNode(threadMessages2, '0')
    const a1 = visitNode(threadMessages2, '1')
    const q2 = visitNode(threadMessages2, '2')
    const a2 = visitNode(threadMessages2, '3')
    const q3 = visitNode(threadMessages2, '4')
    const a3 = visitNode(threadMessages2, '5')
    const q4 = visitNode(threadMessages2, '6')
    const a4 = visitNode(threadMessages2, '7')

    expect(q1.id).toBe('question-1')
    expect(a1.id).toBe('1')
    expect(q2.id).toBe('question-2')
    expect(a2.id).toBe('2')
    expect(q3.id).toBe('question-3')
    expect(a3.id).toBe('3')
    expect(q4.id).toBe('question-4')
    expect(a4.id).toBe('4')

    expect(a1.siblingCount).toBe(1)
    expect(a1.siblingIndex).toBe(0)
    expect(a2.siblingCount).toBe(1)
    expect(a2.siblingIndex).toBe(0)
    expect(a3.siblingCount).toBe(1)
    expect(a3.siblingIndex).toBe(0)
    expect(a4.siblingCount).toBe(1)
    expect(a4.siblingIndex).toBe(0)
  })

  const tree3 = buildChatItemTree(mixedTestMessages as ChatItemInTree[])
  it('should build mixed chat items tree', () => {
    expect(tree3).toHaveLength(1)

    const a1 = visitNode(tree3, '0.children.0')
    expect(a1.id).toBe('1')
    expect(a1.children).toHaveLength(2)

    const a2 = visitNode(a1, 'children.0.children.0')
    expect(a2.id).toBe('2')
    expect(a2.siblingIndex).toBe(0)

    const a3 = visitNode(a2, 'children.0.children.0')
    expect(a3.id).toBe('3')

    const a4 = visitNode(a1, 'children.1.children.0')
    expect(a4.id).toBe('4')
    expect(a4.siblingIndex).toBe(1)
  })

  it('should get thread messages from tree3, using the last message as the target', () => {
    const threadMessages3_1 = getThreadMessages(tree3)
    expect(threadMessages3_1).toHaveLength(4)

    const q1 = visitNode(threadMessages3_1, '0')
    const a1 = visitNode(threadMessages3_1, '1')
    const q4 = visitNode(threadMessages3_1, '2')
    const a4 = visitNode(threadMessages3_1, '3')

    expect(q1.id).toBe('question-1')
    expect(a1.id).toBe('1')
    expect(q4.id).toBe('question-4')
    expect(a4.id).toBe('4')

    expect(a4.siblingCount).toBe(2)
    expect(a4.siblingIndex).toBe(1)
  })

  it('should get thread messages from tree3, using the message with id 3 as the target', () => {
    const threadMessages3_2 = getThreadMessages(tree3, '3')
    expect(threadMessages3_2).toHaveLength(6)

    const q1 = visitNode(threadMessages3_2, '0')
    const a1 = visitNode(threadMessages3_2, '1')
    const q2 = visitNode(threadMessages3_2, '2')
    const a2 = visitNode(threadMessages3_2, '3')
    const q3 = visitNode(threadMessages3_2, '4')
    const a3 = visitNode(threadMessages3_2, '5')

    expect(q1.id).toBe('question-1')
    expect(a1.id).toBe('1')
    expect(q2.id).toBe('question-2')
    expect(a2.id).toBe('2')
    expect(q3.id).toBe('question-3')
    expect(a3.id).toBe('3')

    expect(a2.siblingCount).toBe(2)
    expect(a2.siblingIndex).toBe(0)
  })

  const tree4 = buildChatItemTree(multiRootNodesMessages as ChatItemInTree[])
  it('should build multi root nodes chat items tree', () => {
    expect(tree4).toHaveLength(2)

    const a5 = visitNode(tree4, '1.children.0')
    expect(a5.id).toBe('5')
    expect(a5.siblingIndex).toBe(1)
  })

  it('should get thread messages from tree4, using the last message as the target', () => {
    const threadMessages4 = getThreadMessages(tree4)
    expect(threadMessages4).toHaveLength(2)

    const a1 = visitNode(threadMessages4, '0.children.0')
    expect(a1.id).toBe('5')
  })

  it('should get thread messages from tree4, using the message with id 2 as the target', () => {
    const threadMessages4_1 = getThreadMessages(tree4, '2')
    expect(threadMessages4_1).toHaveLength(6)
    const a1 = visitNode(threadMessages4_1, '1')
    expect(a1.id).toBe('1')
    const a2 = visitNode(threadMessages4_1, '3')
    expect(a2.id).toBe('2')
    const a3 = visitNode(threadMessages4_1, '5')
    expect(a3.id).toBe('3')
  })

  const tree5 = buildChatItemTree(
    multiRootNodesWithLegacyTestMessages as ChatItemInTree[],
  )
  it('should work with multi root nodes chat items with legacy chat items', () => {
    expect(tree5).toHaveLength(2)

    const q5 = visitNode(tree5, '1')
    expect(q5.id).toBe('question-5')
    expect(q5.parentMessageId).toBe(null)

    const a5 = visitNode(q5, 'children.0')
    expect(a5.id).toBe('5')
    expect(a5.children).toHaveLength(0)
  })

  it('should get thread messages from tree5, using the last message as the target', () => {
    const threadMessages5 = getThreadMessages(tree5)
    expect(threadMessages5).toHaveLength(2)

    const q5 = visitNode(threadMessages5, '0')
    const a5 = visitNode(threadMessages5, '1')

    expect(q5.id).toBe('question-5')
    expect(a5.id).toBe('5')

    expect(a5.siblingCount).toBe(2)
    expect(a5.siblingIndex).toBe(1)
  })

  const tree6 = buildChatItemTree(realWorldMessages as ChatItemInTree[])
  it('should work with real world messages', () => {
    expect(tree6).toMatchSnapshot()
  })

  it('should get thread messages from tree6, using the last message as target', () => {
    const threadMessages6_1 = getThreadMessages(tree6)
    expect(threadMessages6_1).toMatchSnapshot()
  })

  it('should get thread messages from tree6, using specified message as target', () => {
    const threadMessages6_2 = getThreadMessages(
      tree6,
      'ff4c2b43-48a5-47ad-9dc5-08b34ddba61b',
    )
    expect(threadMessages6_2).toMatchSnapshot()
  })

  const partialMessages1 = (realWorldMessages as ChatItemInTree[]).slice(-10)
  const tree7 = buildChatItemTree(partialMessages1)
  it('should work with partial messages 1', () => {
    expect(tree7).toMatchSnapshot()
  })

  const partialMessages2 = partialMessages as ChatItemInTree[]
  const tree8 = buildChatItemTree(partialMessages2)
  it('should work with partial messages 2', () => {
    expect(tree8).toMatchSnapshot()
  })
})

// get raw inputs from url parameters
describe('get raw inputs from url parameters', () => {
  beforeEach(() => {
    mockUrlParams({})
    vi.clearAllMocks()
  })

  it('should extract raw input parameters from URL', async () => {
    mockUrlParams({
      input1: 'value1',
      input2: 'value2',
    })

    const inputs = await getRawInputsFromUrlParams()

    expect(inputs.input1).toBe('value1')
    expect(inputs.input2).toBe('value2')
  })

  it('should exclude system parameters (sys.*)', async () => {
    mockUrlParams({
      'sys.id': 'system-id',
      'input1': 'value1',
    })

    const inputs = await getRawInputsFromUrlParams()

    expect(inputs['sys.id']).toBeUndefined()
    expect(inputs.input1).toBe('value1')
  })

  it('should exclude user parameters (user.*)', async () => {
    mockUrlParams({
      'user.name': 'John',
      'input1': 'value1',
    })

    const inputs = await getRawInputsFromUrlParams()

    expect(inputs['user.name']).toBeUndefined()
    expect(inputs.input1).toBe('value1')
  })

  it('should handle empty URL parameters', async () => {
    mockUrlParams({})

    const inputs = await getRawInputsFromUrlParams()

    expect(Object.keys(inputs)).toHaveLength(0)
  })

  it('should decode URL-encoded values', async () => {
    mockUrlParams({
      input: 'hello%20world%21',
    })

    const inputs = await getRawInputsFromUrlParams()

    expect(inputs.input).toBe('hello world!')
  })

  it('should handle special characters in values', async () => {
    mockUrlParams({
      input: 'test%40example%2Ecom',
    })

    const inputs = await getRawInputsFromUrlParams()

    expect(inputs.input).toBe('test@example.com')
  })

  it('should handle multiple values with same key (last one wins)', async () => {
    const searchParams = new URLSearchParams()
    searchParams.append('input', 'value1')
    searchParams.append('input', 'value2')

    Object.defineProperty(window, 'location', {
      value: {
        search: `?${searchParams.toString()}`,
      },
      writable: true,
    })

    const inputs = await getRawInputsFromUrlParams()

    expect(inputs.input).toBe('value2')
  })
})

// get processed inputs from url parameters
describe('get processed inputs from url parameters', () => {
  beforeEach(() => {
    mockUrlParams({})
    vi.clearAllMocks()
  })

  it('should extract and process input parameters', async () => {
    mockUrlParams({
      input1: 'value1',
      input2: 'value2',
    })

    const inputs = await getProcessedInputsFromUrlParams()

    // Decompression will fail, returning undefined
    expect(inputs.input1).toBeUndefined()
    expect(inputs.input2).toBeUndefined()
  })

  it('should exclude system and user parameters', async () => {
    mockUrlParams({
      'input1': 'value1',
      'sys.id': 'system-id',
      'user.name': 'John',
    })

    const inputs = await getProcessedInputsFromUrlParams()

    expect(inputs['sys.id']).toBeUndefined()
    expect(inputs['user.name']).toBeUndefined()
  })

  it('should handle empty URL parameters', async () => {
    mockUrlParams({})

    const inputs = await getProcessedInputsFromUrlParams()

    expect(Object.keys(inputs)).toHaveLength(0)
  })

  it('should handle decompression failures gracefully', async () => {
    // Mock base64 that will fail decompression
    mockUrlParams({
      input: 'not-valid-base64-gzip!@#$',
    })

    const inputs = await getProcessedInputsFromUrlParams()

    // Should return undefined for failed decompressions
    expect(inputs.input).toBeUndefined()
  })
})

// get processed system variables from url parameters
describe('get processed system variables from url parameters', () => {
  beforeEach(() => {
    mockUrlParams({})
    vi.clearAllMocks()
  })

  it('should extract system variables from URL parameters', async () => {
    mockUrlParams({
      'sys.id': 'system-id',
      'sys.name': 'system-name',
    })

    const sysVars = await getProcessedSystemVariablesFromUrlParams()

    // After decompression attempt (which will fail gracefully), result should be undefined
    expect(sysVars.id).toBeUndefined()
    expect(sysVars.name).toBeUndefined()
  })

  it('should handle redirect_url parameter', async () => {
    const redirectUrl = encodeURIComponent(
      'https://example.com?sys.id=123&sys.name=test',
    )
    mockUrlParams({
      redirect_url: redirectUrl,
    })

    const sysVars = await getProcessedSystemVariablesFromUrlParams()

    // Should process the redirect URL
    expect(typeof sysVars).toBe('object')
  })

  it('should ignore redirect_url with no query string', async () => {
    mockUrlParams({
      redirect_url: 'https://example.com',
    })

    const sysVars = await getProcessedSystemVariablesFromUrlParams()

    expect(typeof sysVars).toBe('object')
  })

  it('should handle empty URL parameters', async () => {
    mockUrlParams({})

    const sysVars = await getProcessedSystemVariablesFromUrlParams()

    expect(typeof sysVars).toBe('object')
  })
})

// get processed user variables from url parameters
describe('get processed user variables from url parameters', () => {
  beforeEach(() => {
    mockUrlParams({})
    vi.clearAllMocks()
  })
  it('should extract processed user variables', async () => {
    mockUrlParams({
      'user.name': 'John',
      'user.email': 'john@example.com',
    })

    const userVars = await getProcessedUserVariablesFromUrlParams()

    // Decompression will fail, returning undefined
    expect(userVars.name).toBeUndefined()
    expect(userVars.email).toBeUndefined()
  })

  it('should exclude system variables', async () => {
    mockUrlParams({
      'user.name': 'John',
      'sys.id': 'system-id',
    })

    const userVars = await getProcessedUserVariablesFromUrlParams()

    expect(userVars['sys.id']).toBeUndefined()
  })

  it('should return empty object when no user variables present', async () => {
    mockUrlParams({
      'sys.id': 'system-id',
    })

    const userVars = await getProcessedUserVariablesFromUrlParams()

    expect(Object.keys(userVars)).toHaveLength(0)
  })

  it('should handle empty URL parameters', async () => {
    mockUrlParams({})

    const userVars = await getProcessedUserVariablesFromUrlParams()

    expect(Object.keys(userVars)).toHaveLength(0)
  })
})

// get raw user variables from url parameters
describe('get raw user variables from url parameters', () => {
  beforeEach(() => {
    mockUrlParams({})
    vi.clearAllMocks()
  })
  it('should extract user variables from URL parameters', async () => {
    mockUrlParams({
      'user.name': 'John',
      'user.email': 'john@example.com',
    })

    const userVars = await getRawUserVariablesFromUrlParams()

    expect(userVars.name).toBe('John')
    expect(userVars.email).toBe('john@example.com')
  })

  it('should exclude system variables', async () => {
    mockUrlParams({
      'user.name': 'John',
      'sys.id': 'system-id',
      'input': 'value',
    })

    const userVars = await getRawUserVariablesFromUrlParams()

    expect(userVars.name).toBe('John')
    expect(userVars['sys.id']).toBeUndefined()
    expect(userVars.input).toBeUndefined()
  })

  it('should return empty object when no user variables present', async () => {
    mockUrlParams({
      'sys.id': 'system-id',
      'input': 'value',
    })

    const userVars = await getRawUserVariablesFromUrlParams()

    expect(Object.keys(userVars)).toHaveLength(0)
  })

  it('should decode URL-encoded user variable values', async () => {
    mockUrlParams({
      'user.message': 'hello%20world',
    })

    const userVars = await getRawUserVariablesFromUrlParams()

    expect(userVars.message).toBe('hello world')
  })

  it('should handle empty URL parameters', async () => {
    mockUrlParams({})

    const userVars = await getRawUserVariablesFromUrlParams()

    expect(Object.keys(userVars)).toHaveLength(0)
  })
})

describe('Special characters and encoding', () => {
  it('should handle special characters in content', () => {
    const answer = createTestAnswer({
      content: 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
    })

    expect(isValidGeneratedAnswer(answer)).toBe(true)
    expect(answer.content).toContain('!@#$%^&*()')
  })

  it('should handle unicode characters in content', () => {
    const answer = createTestAnswer({
      content: '你好世界 🌍 مرحبا بالعالم',
    })

    expect(isValidGeneratedAnswer(answer)).toBe(true)
    expect(answer.content).toContain('你好世界')
  })

  it('should handle very long content', () => {
    const longContent = 'a'.repeat(10000)
    const answer = createTestAnswer({
      content: longContent,
    })

    expect(answer.content.length).toBe(10000)
    expect(isValidGeneratedAnswer(answer)).toBe(true)
  })
})

describe('ID edge cases', () => {
  it('should handle empty string IDs', () => {
    const answer = createTestAnswer({ id: '' })
    expect(isValidGeneratedAnswer(answer)).toBe(true)
  })

  it('should handle very long IDs', () => {
    const longId = 'a'.repeat(1000)
    const answer = createTestAnswer({ id: longId })
    expect(answer.id).toBe(longId)
  })

  it('should handle IDs with special characters', () => {
    const specialId = 'id-123_ABC.test@123'
    const answer = createTestAnswer({ id: specialId })
    expect(answer.id).toBe(specialId)
  })

  it('should correctly identify answer-placeholder prefix', () => {
    const testCases = [
      { id: 'answer-placeholder-1', expected: false },
      { id: 'answer-placeholder-', expected: false },
      { id: 'answer-placeholder', expected: true },
      { id: 'answer-placeholder-abc', expected: false },
      { id: 'answer-placeholderXX', expected: true },
    ]

    testCases.forEach(({ id, expected }) => {
      const answer = createTestAnswer({ id })
      expect(isValidGeneratedAnswer(answer)).toBe(expected)
    })
  })
})

// check for last answer retrieval
describe('get last answer from chat list', () => {
  it('should return the last valid answer from chat list', () => {
    const question1 = createTestChatItem({ id: 'q1', isAnswer: false })
    const answer1 = createTestAnswer({ id: 'a1' })
    const question2 = createTestChatItem({ id: 'q2', isAnswer: false })
    const answer2 = createTestAnswer({ id: 'a2' })

    const chatList = [question1, answer1, question2, answer2]
    const result = getLastAnswer(chatList)

    expect(result?.id).toBe('a2')
  })

  it('should return null when chat list is empty', () => {
    const result = getLastAnswer([])
    expect(result).toBeNull()
  })

  it('should return null when no valid answers exist', () => {
    const question1 = createTestChatItem({ id: 'q1' })
    const question2 = createTestChatItem({ id: 'q2' })
    const chatList = [question1, question2]

    const result = getLastAnswer(chatList)
    expect(result).toBeNull()
  })

  it('should skip placeholder answers and return the last valid one', () => {
    const question1 = createTestChatItem({ id: 'q1' })
    const answer1 = createTestAnswer({ id: 'a1' })
    const placeholder = createTestAnswer({ id: 'answer-placeholder-123' })

    const chatList = [question1, answer1, placeholder]
    const result = getLastAnswer(chatList)

    expect(result?.id).toBe('a1')
  })

  it('should skip opening statements and return the last valid answer', () => {
    const question1 = createTestChatItem({ id: 'q1' })
    const answer1 = createTestAnswer({ id: 'a1' })
    const openingStatement = createTestAnswer({
      id: 'a2',
      isOpeningStatement: true,
    })

    const chatList = [question1, answer1, openingStatement]
    const result = getLastAnswer(chatList)

    expect(result?.id).toBe('a1')
  })

  it('should work with ChatItemInTree items', () => {
    const treeItems: ChatItemInTree[] = [
      { ...createTestChatItem({ id: 'q1' }), children: [] },
      { ...createTestAnswer({ id: 'a1' }), children: [] },
    ]

    const result = getLastAnswer(treeItems)
    expect(result?.id).toBe('a1')
  })

  it('should return null when all answers are invalid', () => {
    const question = createTestChatItem({ id: 'q1' })
    const placeholder = createTestAnswer({
      id: 'answer-placeholder-123',
    })
    const openingStatement = createTestAnswer({
      id: 'a2',
      isOpeningStatement: true,
    })

    const chatList = [question, placeholder, openingStatement]
    const result = getLastAnswer(chatList)

    expect(result).toBeNull()
  })
})
