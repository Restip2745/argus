/**
 * Lightweight page rendered when a panel is opened in a popout window.
 * URL: /?popout=event  or  /?popout=region
 * Receives live state from the main window via BroadcastChannel.
 */
import { useEffect } from 'react'
import { EventPanel } from './components/panels/EventPanel'
import { RegionPanel } from './components/panels/RegionPanel'
import { usePopoutSync } from './hooks/usePopoutSync'
import './i18n'

const params = new URLSearchParams(window.location.search)
const popoutType = params.get('popout') ?? 'event'   // 'event' | 'region'

export default function PopoutPage() {
  usePopoutSync('guest')

  useEffect(() => {
    document.title = popoutType === 'region' ? 'ARGUS — Region Intel' : 'ARGUS — Event Intel'
    document.body.style.background = '#04091622'
    document.body.style.overflow = 'hidden'
  }, [])

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: 'transparent' }}>
      {popoutType === 'region' ? (
        // Render region panel in full-width static mode
        <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', background: 'rgba(4,9,22,0.97)' }}>
          <RegionPanel />
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', background: 'rgba(4,9,22,0.97)' }}>
          <EventPanel />
        </div>
      )}
    </div>
  )
}
