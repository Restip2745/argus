import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgentQuery } from '../useAgentQuery'

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(ctrl) {
      for (const c of chunks) ctrl.enqueue(enc.encode(c))
      ctrl.close()
    },
  })
}

function sseChunk(text: string) { return `data: ${JSON.stringify({ text })}\n\n` }
function sseDone() { return 'data: [DONE]\n\n' }

describe('useAgentQuery', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useAgentQuery())
    expect(result.current.history).toHaveLength(0)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('clear() resets history and error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: makeStream([sseChunk('response text'), sseDone()]),
    } as unknown as Response)

    const { result } = renderHook(() => useAgentQuery())
    await act(async () => { await result.current.ask('q', 'ctx') })
    expect(result.current.history).toHaveLength(1)

    act(() => result.current.clear())
    expect(result.current.history).toHaveLength(0)
    expect(result.current.error).toBeNull()
  })

  it('sets error when server returns non-ok status', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false, status: 500,
    } as unknown as Response)

    const { result } = renderHook(() => useAgentQuery())
    await act(async () => { await result.current.ask('q', 'ctx') })
    expect(result.current.error).toMatch(/HTTP 500/)
    expect(result.current.history).toHaveLength(0)
  })

  it('truncates context > 8000 chars before sending', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: makeStream([sseChunk('ok'), sseDone()]),
    } as unknown as Response)

    const longContext = 'x'.repeat(9000)
    const { result } = renderHook(() => useAgentQuery())
    await act(async () => { await result.current.ask('q', longContext) })

    const callBody = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    expect(callBody.context.length).toBeLessThanOrEqual(8000)
  })

  it('marks entry streaming: false after stream completes', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: makeStream([sseChunk('hello '), sseChunk('world'), sseDone()]),
    } as unknown as Response)

    const { result } = renderHook(() => useAgentQuery())
    await act(async () => { await result.current.ask('q', '') })
    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].streaming).toBe(false)
  })

  it('appends stream-interrupted-notice when [DONE] not received', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      body: makeStream([sseChunk('partial'), /* no [DONE] */]),
    } as unknown as Response)

    const { result } = renderHook(() => useAgentQuery())
    await act(async () => { await result.current.ask('q', '') })
    expect(result.current.history[0].html).toContain('stream-interrupted-notice')
  })
})

/**
 * Subject isolation.
 *
 * Not about leakage — the server sends only a system prompt and one user
 * message, so the model never sees earlier turns and answers each question in
 * isolation regardless. It is about the transcript reading as a conversation:
 * left standing across a switch, the second answer looks like it followed from
 * the first when it was asked with only the new subject's context.
 */
describe('useAgentQuery — subject isolation', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  const answered = () => vi.mocked(fetch).mockResolvedValue({
    ok: true, body: makeStream([sseChunk('answer'), sseDone()]),
  } as unknown as Response)

  it('keeps the transcript across re-renders with the same subject', async () => {
    answered()
    const { result, rerender } = renderHook(({ k }) => useAgentQuery(k), {
      initialProps: { k: 'usa' },
    })
    await act(async () => { await result.current.ask('q', 'ctx') })
    expect(result.current.history).toHaveLength(1)

    rerender({ k: 'usa' })
    expect(result.current.history).toHaveLength(1)
  })

  it('discards the transcript when the subject changes', async () => {
    answered()
    const { result, rerender } = renderHook(({ k }) => useAgentQuery(k), {
      initialProps: { k: 'usa' },
    })
    await act(async () => { await result.current.ask('q', 'ctx') })
    expect(result.current.history).toHaveLength(1)

    act(() => { rerender({ k: 'russia' }) })
    expect(result.current.history).toHaveLength(0)
    expect(result.current.error).toBeNull()
  })

  it('does not clear on first mount', () => {
    const { result } = renderHook(() => useAgentQuery('usa'))
    expect(result.current.history).toHaveLength(0)
    expect(result.current.loading).toBe(false)
  })

  it('still works when no subject is given', async () => {
    answered()
    const { result, rerender } = renderHook(() => useAgentQuery())
    await act(async () => { await result.current.ask('q', 'ctx') })
    rerender()
    expect(result.current.history).toHaveLength(1)
  })

  it('does not leave loading stuck when the subject changes mid-request', async () => {
    // A body that never closes, so the request is still in flight at the switch.
    vi.mocked(fetch).mockResolvedValue({
      ok: true, body: new ReadableStream<Uint8Array>({ start() {} }),
    } as unknown as Response)

    const { result, rerender } = renderHook(({ k }) => useAgentQuery(k), {
      initialProps: { k: 'a' },
    })
    act(() => { void result.current.ask('q', 'ctx') })
    await act(async () => { await Promise.resolve() })

    act(() => { rerender({ k: 'b' }) })
    // Stuck loading would leave the send button disabled on the new subject.
    expect(result.current.loading).toBe(false)
    expect(result.current.history).toHaveLength(0)
  })
})
