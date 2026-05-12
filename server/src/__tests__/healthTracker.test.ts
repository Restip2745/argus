import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  setLastScraperRun,
  recordFeedSuccess,
  recordFeedError,
  getHealthSnapshot,
} from '../services/healthTracker'

// Stub out DB call since we're unit testing the health tracker
vi.mock('../db/sqlite', () => ({
  getAnalyzedArticles: () => [1, 2, 3],
}))

// Stub getLlmConfig to avoid real Ollama calls
vi.mock('../config/llmConfig', () => ({
  getLlmConfig: () => ({ host: 'http://localhost:11434', model: 'test' }),
}))

describe('healthTracker', () => {
  it('getHealthSnapshot returns expected shape', () => {
    const snap = getHealthSnapshot()
    expect(snap).toHaveProperty('status', 'ok')
    expect(snap).toHaveProperty('timestamp')
    expect(snap).toHaveProperty('ollamaOnline')
    expect(snap).toHaveProperty('lastScraperRun')
    expect(snap).toHaveProperty('analyzedCount')
    expect(snap).toHaveProperty('feedStatuses')
    expect(Array.isArray(snap.feedStatuses)).toBe(true)
  })

  it('setLastScraperRun updates lastScraperRun in snapshot', () => {
    const iso = new Date().toISOString()
    setLastScraperRun(iso)
    expect(getHealthSnapshot().lastScraperRun).toBe(iso)
  })

  it('recordFeedSuccess marks feed as healthy', () => {
    const feed = `feed-test-${Date.now()}`
    recordFeedSuccess(feed)
    const snap = getHealthSnapshot()
    const fs = snap.feedStatuses.find((f) => f.name === feed)
    expect(fs).toBeTruthy()
    expect(fs!.lastSuccess).toBeTruthy()
    expect(fs!.errorMessage).toBeNull()
  })

  it('recordFeedError records error message', () => {
    const feed = `feed-err-${Date.now()}`
    recordFeedError(feed, 'Connection refused')
    const snap = getHealthSnapshot()
    const fs = snap.feedStatuses.find((f) => f.name === feed)
    expect(fs).toBeTruthy()
    expect(fs!.lastError).toBeTruthy()
    expect(fs!.errorMessage).toBe('Connection refused')
  })

  it('recordFeedSuccess after error preserves previous error timestamp but clears message', () => {
    const feed = `feed-both-${Date.now()}`
    recordFeedError(feed, 'timeout')
    recordFeedSuccess(feed)
    const snap = getHealthSnapshot()
    const fs = snap.feedStatuses.find((f) => f.name === feed)
    expect(fs!.lastSuccess).toBeTruthy()
    expect(fs!.errorMessage).toBeNull()
    // Previous error time still preserved
    expect(fs!.lastError).toBeTruthy()
  })

  it('analyzedCount reflects mocked DB length', () => {
    expect(getHealthSnapshot().analyzedCount).toBe(3)
  })
})
