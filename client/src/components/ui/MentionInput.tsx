/**
 * A question box that can name entities with `@`.
 *
 * The click path collects what is on screen; this collects what the operator
 * already has in mind. It stays presentational — it reports which candidate was
 * picked and lets the panel decide what that means — because picking is where
 * the network and the collection limit come in, and neither belongs in a text
 * field.
 */
import { useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { MentionCandidate } from '../../lib/mentionCandidates'
import { matchMentions } from '../../lib/mentionCandidates'

interface Props {
  value:       string
  onChange:    (v: string) => void
  onSubmit:    () => void
  candidates:  MentionCandidate[]
  /** Ids already collected. Those candidates are shown, but cannot be picked. */
  collected:   Set<string>
  onPick:      (candidate: MentionCandidate) => void
  /** Set when the collection is full: the list explains itself instead of adding. */
  full?:       boolean
  placeholder: string
  disabled?:   boolean
  accentColor: string
}

const TYPE_MARK = { region: '⊙', wiki: '◈', event: '◉', celestial: '✦' } as const

/**
 * What an `@` may not follow.
 *
 * Requiring whitespace before it is the obvious rule and the wrong one here:
 * Chinese is written without spaces between words, so `比較美國和@川普` — the way
 * the question actually gets typed — would never open the list. What has to be
 * excluded is the one thing `@` already means, an address, and that is enough:
 * the local part of an address is latin word characters, so refusing only those
 * keeps `mail@example` out while letting a mention start after 和, after 。, and
 * after a question mark.
 */
const NOT_BEFORE_MENTION = /[A-Za-z0-9._%+-]/

/**
 * The `@…` being typed, or null. Closed by the space that follows a finished
 * name, so the list stops offering things once the operator has moved on to the
 * rest of the question.
 */
export function activeMention(text: string, caret: number): { start: number; query: string } | null {
  const upto = text.slice(0, caret)
  const at   = upto.lastIndexOf('@')
  if (at === -1) return null
  if (at > 0 && NOT_BEFORE_MENTION.test(upto[at - 1])) return null
  const query = upto.slice(at + 1)
  if (/\s/.test(query)) return null
  return { start: at, query }
}

export function MentionInput({
  value, onChange, onSubmit,
  candidates, collected, onPick, full = false,
  placeholder, disabled = false, accentColor,
}: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [caret, setCaret] = useState(0)
  const [active, setActive] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  const mention = dismissed ? null : activeMention(value, caret)
  const shown   = mention ? matchMentions(candidates, mention.query) : []
  const open    = mention !== null && shown.length > 0

  // Caret only. Reopening a dismissed list is the business of typing, not of
  // the keyup that follows the Escape which closed it.
  const sync = (el: HTMLInputElement) => setCaret(el.selectionStart ?? el.value.length)

  const pick = (candidate: MentionCandidate) => {
    if (full || collected.has(candidate.id)) return
    onPick(candidate)
    // The name is left standing in the question. The agent is told about the
    // entity through the context, but the sentence still has to read like one.
    const before = value.slice(0, mention!.start)
    const after  = value.slice(caret)
    const next   = `${before}${candidate.name} ${after}`
    onChange(next)
    setDismissed(true)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      const pos = before.length + candidate.name.length + 1
      el.focus()
      el.setSelectionRange(pos, pos)
      setCaret(pos)
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % shown.length); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => (i - 1 + shown.length) % shown.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(shown[Math.min(active, shown.length - 1)]); return }
      if (e.key === 'Escape')    { e.preventDefault(); setDismissed(true); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit() }
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'rgba(4,9,22,0.98)', border: `1px solid ${accentColor}30`,
            borderRadius: '3px', overflow: 'hidden', zIndex: 10,
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          }}
        >
          {full && (
            <div style={{ color: '#ff9c2a', fontSize: '10px', letterSpacing: '0.1em', padding: '5px 8px' }}>
              {t('context.limitReached', 'ENTITY LIMIT REACHED')}
            </div>
          )}
          {shown.map((c, i) => {
            const already = collected.has(c.id)
            return (
              <button
                key={c.id}
                role="option"
                aria-selected={i === active}
                // The list closes on blur, which fires before click — so the
                // pick has to happen while the input still has focus.
                onMouseDown={e => { e.preventDefault(); pick(c) }}
                onMouseEnter={() => setActive(i)}
                disabled={full || already}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: '6px', width: '100%',
                  background: i === active ? `${accentColor}14` : 'none',
                  border: 'none', borderBottom: `1px solid ${accentColor}10`,
                  padding: '4px 8px', cursor: full || already ? 'default' : 'pointer',
                  fontFamily: 'JetBrains Mono, monospace', textAlign: 'left',
                  opacity: full || already ? 0.45 : 1,
                }}
              >
                <span style={{ color: accentColor, fontSize: '10px' }}>{TYPE_MARK[c.type]}</span>
                <span style={{
                  color: '#c8dde8', fontSize: '10px', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.name}
                  {c.via && <span style={{ color: '#4a6070' }}> · {c.via}</span>}
                </span>
                {already && (
                  <span style={{ color: '#4a6070', fontSize: '10px', letterSpacing: '0.08em' }}>
                    {t('context.inContext', 'Already in context')}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={e => { onChange(e.target.value); sync(e.target); setActive(0); setDismissed(false) }}
        onKeyUp={e => sync(e.currentTarget)}
        onClick={e => sync(e.currentTarget)}
        onBlur={() => setDismissed(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%', background: `${accentColor}0d`, border: `1px solid ${accentColor}25`,
          borderRadius: '3px', color: '#a8c4d8', fontSize: '11px', padding: '5px 8px',
          fontFamily: 'JetBrains Mono, monospace', outline: 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      />
    </div>
  )
}
