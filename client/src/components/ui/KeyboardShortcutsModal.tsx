import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../../hooks/useFocusTrap'

interface Props {
  onClose: () => void
}

export function KeyboardShortcutsModal({ onClose }: Props) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, true)

  const SHORTCUTS: { key: string; descKey: string }[] = [
    { key: '/',      descKey: 'keyboard.shortcuts.search' },
    { key: 'Escape', descKey: 'keyboard.shortcuts.close' },
    { key: 'i / I',  descKey: 'keyboard.shortcuts.immersive' },
    { key: 'b / B',  descKey: 'keyboard.shortcuts.bookmark' },
    { key: '[',      descKey: 'keyboard.shortcuts.prevEvent' },
    { key: ']',      descKey: 'keyboard.shortcuts.nextEvent' },
    { key: '?',      descKey: 'keyboard.shortcuts.help' },
  ]

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('keyboard.title')}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(4,9,22,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500,
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(4,9,22,0.97)',
          border: '1px solid rgba(0,180,255,0.2)',
          borderTop: '2px solid rgba(0,212,255,0.5)',
          borderRadius: '4px',
          padding: '18px 22px',
          width: '320px',
          boxShadow: '0 0 40px rgba(0,60,120,0.5)',
          animation: 'navFadeIn 0.2s ease both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ color: '#00d4ff', fontSize: '9px', letterSpacing: '0.15em', fontWeight: 700 }}>{t('keyboard.title')}</span>
          <button
            onClick={onClose}
            style={{ color: '#4a6070', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
            aria-label={t('config.actions.close')}
          >✕</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {SHORTCUTS.map(({ key, descKey }) => (
              <tr key={key} style={{ borderBottom: '1px solid rgba(0,180,255,0.06)' }}>
                <td style={{ padding: '5px 8px 5px 0', width: '90px' }}>
                  <kbd style={{
                    display: 'inline-block',
                    background: 'rgba(0,180,255,0.08)',
                    border: '1px solid rgba(0,180,255,0.2)',
                    borderRadius: '2px',
                    padding: '1px 5px',
                    fontSize: '8px',
                    color: '#00d4ff',
                    letterSpacing: '0.05em',
                  }}>
                    {key}
                  </kbd>
                </td>
                <td style={{ padding: '5px 0', fontSize: '9px', color: '#6a90a8', letterSpacing: '0.04em' }}>
                  {t(descKey)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: '10px', fontSize: '7px', color: '#2a4060', letterSpacing: '0.08em', textAlign: 'center' }}>
          {t('keyboard.closeHint')}
        </div>
      </div>
    </div>
  )
}
