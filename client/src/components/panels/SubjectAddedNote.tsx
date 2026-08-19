import { useTranslation } from 'react-i18next'

/**
 * The mark left in a transcript where the subject grew.
 *
 * The agent answers each question in isolation, so an answer knows only the
 * entities that were collected when it was asked. Adding one no longer wipes
 * the transcript — every earlier answer is still true of what it was asked
 * about — but the transcript would otherwise read as though the whole of it
 * had the new entity in view. This is the line that says it did not.
 */
export function SubjectAddedNote({ labels, accentColor }: { labels: string[]; accentColor: string }) {
  const { t } = useTranslation()
  return (
    <div style={{
      margin: '8px 0 9px',
      borderTop: `1px dashed ${accentColor}25`,
      paddingTop: '5px',
      color: `${accentColor}88`,
      fontSize: '10px',
      letterSpacing: '0.1em',
      lineHeight: 1.5,
    }}>
      {t('agent.subjectAdded', {
        names: labels.join(' · '),
        defaultValue: '+ {{names}} — EARLIER ANSWERS DID NOT SEE IT',
      })}
    </div>
  )
}
