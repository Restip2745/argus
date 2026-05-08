import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Stars } from '@react-three/drei'
import { SolarSystem } from './components/scene/SolarSystem'
import { EventPanel } from './components/panels/EventPanel'
import { RegionPanel } from './components/panels/RegionPanel'
import { Sidebar } from './components/ui/Sidebar'
import { LanguageSwitcher } from './components/ui/LanguageSwitcher'
import { AnnotationCanvas } from './components/canvas/AnnotationCanvas'
import { CelestialNavList } from './components/ui/CelestialNavList'
import { ConfigModal } from './components/ui/ConfigModal'
import { EventStack } from './components/ui/EventStack'
import { CategoryFilterBar } from './components/ui/CategoryFilterBar'
import { FloatDock } from './components/ui/FloatDock'
import { CanvasAnalysisPanel } from './components/ui/CanvasAnalysisPanel'
import { CelestialBodyPanel } from './components/panels/CelestialBodyPanel'
import { PersonPanel } from './components/panels/PersonPanel'
import { ToastContainer } from './components/ui/ToastContainer'
import { useAppStore } from './store'
import { useOllamaSocket } from './hooks/useOllamaSocket'
import { usePopoutSync } from './hooks/usePopoutSync'
import { useFilteredEvents } from './hooks/useFilteredEvents'
import './i18n'

export default function App() {
  useOllamaSocket()
  usePopoutSync('host')
  const showAnnotationCanvas    = useAppStore((s) => s.showAnnotationCanvas)
  const showConfig    = useAppStore((s) => s.showConfig)
  const setShowConfig = useAppStore((s) => s.setShowConfig)
  const uiScale       = useAppStore((s) => s.uiScale)
  const liteMode      = useAppStore((s) => s.liteMode)
  const setLiteMode   = useAppStore((s) => s.setLiteMode)
  const immersiveMode    = useAppStore((s) => s.immersiveMode)
  const setImmersiveMode = useAppStore((s) => s.setImmersiveMode)
  const [showCanvasAnalysis, setShowCanvasAnalysis] = useState(false)

  const activePanelId       = useAppStore((s) => s.activePanelId)
  const setActivePanelId    = useAppStore((s) => s.setActivePanelId)
  const setSelectedCountry  = useAppStore((s) => s.setSelectedCountry)
  const clearSelectedPersons = useAppStore((s) => s.clearSelectedPersons)
  const toggleBookmark      = useAppStore((s) => s.toggleBookmark)
  const filteredEvents      = useFilteredEvents()

  // ── Global keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA'

      // / → focus search (works even from outside inputs)
      if (e.key === '/' && !inInput) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('argus:focus-search'))
        return
      }

      // All other shortcuts ignored while typing
      if (inInput) return

      switch (e.key) {
        case 'Escape':
          // Close panels in reverse open order
          if (activePanelId) { setActivePanelId(null); break }
          setSelectedCountry(null)
          clearSelectedPersons()
          break

        case 'i':
        case 'I':
          setImmersiveMode(!immersiveMode)
          if (!immersiveMode) setLiteMode(false)
          break

        case 'b':
        case 'B':
          if (activePanelId) toggleBookmark(activePanelId)
          break

        case '[': {
          if (filteredEvents.length === 0) break
          const idx = filteredEvents.findIndex(ev => ev.id === activePanelId)
          const prev = idx <= 0 ? filteredEvents[filteredEvents.length - 1] : filteredEvents[idx - 1]
          setActivePanelId(prev.id)
          break
        }
        case ']': {
          if (filteredEvents.length === 0) break
          const idx = filteredEvents.findIndex(ev => ev.id === activePanelId)
          const next = idx < 0 || idx >= filteredEvents.length - 1 ? filteredEvents[0] : filteredEvents[idx + 1]
          setActivePanelId(next.id)
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [immersiveMode, setImmersiveMode, setLiteMode,
      activePanelId, setActivePanelId, setSelectedCountry, clearSelectedPersons,
      toggleBookmark, filteredEvents])

  const hudVisible = !immersiveMode

  return (
    <div className="fixed inset-0 bg-[#04060f] overflow-hidden">
      {/* ── 3-D Solar System Canvas ───────────────────────────────────── */}
      <Canvas
        camera={{ position: [0, 180, 520], fov: 55, near: 0.01, far: 200000 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
        shadows={{ type: THREE.PCFSoftShadowMap }}
      >
        <Suspense fallback={null}>
          <Stars radius={8000} depth={80} count={16000} factor={3} saturation={0.15} speed={0} />
          <Stars radius={3000} depth={40} count={4000}  factor={5} saturation={0.1}  speed={0} />
          <SolarSystem />
        </Suspense>
      </Canvas>

      {/* ── Annotation overlay (always on top of canvas, outside HUD scale) ── */}
      {showAnnotationCanvas && <AnnotationCanvas />}

      {/* ── Toast notifications (outside HUD scale, always visible) ─────── */}
      <ToastContainer />

      {/* ── Scaled HUD layer ─────────────────────────────────────────────── */}
      <div style={{ zoom: uiScale }}>

        {hudVisible ? (
          <>
            {/* ── Sidebar / Lite mode ────────────────────────────────────── */}
            {liteMode ? (
              <>
                <button
                  onClick={() => setLiteMode(false)}
                  title="Normal mode"
                  style={{ width: '28px', height: '28px', top: '8px', left: '8px' }}
                  className="absolute z-50 flex items-center justify-center text-[#4a6070] hover:text-[#00d4ff] border border-[rgba(0,180,255,0.15)] hover:border-[rgba(0,180,255,0.4)] rounded transition-colors bg-[rgba(4,9,22,0.8)] text-[13px] font-mono"
                >
                  ☰
                </button>
                <EventStack />
              </>
            ) : (
              <Sidebar />
            )}

            <CategoryFilterBar />
            <FloatDock />
            <EventPanel />
            <RegionPanel />
            <CelestialBodyPanel />
            <PersonPanel />
            <CelestialNavList />

            {/* ── Top-right control bar ──────────────────────────────────── */}
            <div className="absolute top-3 right-3 z-50 flex items-center gap-1.5">
              <LanguageSwitcher />
              <button
                onClick={() => setShowCanvasAnalysis(v => !v)}
                title="AI Canvas Analysis"
                style={{ width: '28px', height: '28px' }}
                className={`flex items-center justify-center border rounded transition-colors bg-[rgba(4,9,22,0.8)] text-[10px] ${
                  showCanvasAnalysis
                    ? 'text-[#9b6dff] border-[rgba(155,109,255,0.5)]'
                    : 'text-[#4a6070] border-[rgba(0,180,255,0.15)] hover:text-[#9b6dff]'
                }`}
              >⊙</button>
              <button
                onClick={() => setShowConfig(true)}
                title="Configuration"
                style={{ width: '28px', height: '28px' }}
                className="flex items-center justify-center text-[#4a6070] hover:text-[#00d4ff] border border-[rgba(0,180,255,0.15)] hover:border-[rgba(0,180,255,0.4)] rounded transition-colors bg-[rgba(4,9,22,0.8)]"
              >
                ⚙
              </button>
              {/* Immersive toggle */}
              <button
                onClick={() => { setImmersiveMode(true); setLiteMode(false) }}
                title="Immersive mode (I)"
                style={{ width: '28px', height: '28px' }}
                className="flex items-center justify-center text-[#4a6070] hover:text-[#00d4ff] border border-[rgba(0,180,255,0.15)] hover:border-[rgba(0,180,255,0.4)] rounded transition-colors bg-[rgba(4,9,22,0.8)] text-[11px]"
              >
                ⊠
              </button>
            </div>

            {/* ── Config modal ───────────────────────────────────────────── */}
            {showConfig && <ConfigModal />}

            {/* ── AI Canvas Analysis panel ───────────────────────────────── */}
            {showCanvasAnalysis && <CanvasAnalysisPanel onClose={() => setShowCanvasAnalysis(false)} />}

          </>
        ) : (
          /* ── Immersive mode: FloatDock only ──────────────────────────── */
          <>
            <FloatDock />
            {/* Still render panels so they remain accessible from dock */}
            <EventPanel />
            <RegionPanel />
            <CelestialBodyPanel />
            <PersonPanel />
            {showConfig && <ConfigModal />}
            {showCanvasAnalysis && <CanvasAnalysisPanel onClose={() => setShowCanvasAnalysis(false)} />}
          </>
        )}

      </div>{/* end scaled HUD layer */}
    </div>
  )
}
