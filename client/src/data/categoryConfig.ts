/** Shared category display constants — safe to import from any file without breaking HMR. */

export const CATEGORY_COLOR: Record<string, string> = {
  ARMED_CONFLICT: '#ff4d4d',
  POLITICAL:      '#ff9c2a',
  ECONOMIC:       '#ffd700',
  SOCIAL:         '#c8cdd2',
  SCIENCE_TECH:   '#9b6dff',
  ENVIRONMENT:    '#39ff8a',
  HEALTH:         '#a0c4ff',
  CRIME_SECURITY: '#6a8090',
  SPACE:          '#00d4ff',
}

export const CATEGORY_ICON: Record<string, string> = {
  ARMED_CONFLICT: '⚔',
  POLITICAL:      '◈',
  ECONOMIC:       '◉',
  SOCIAL:         '◎',
  SCIENCE_TECH:   '⚛',
  ENVIRONMENT:    '◬',
  HEALTH:         '✚',
  CRIME_SECURITY: '⬡',
  SPACE:          '✦',
}

export const CATEGORY_LABEL: Record<string, string> = {
  ARMED_CONFLICT: 'CONFLICT',
  POLITICAL:      'POLITICAL',
  ECONOMIC:       'ECONOMIC',
  SOCIAL:         'SOCIAL',
  SCIENCE_TECH:   'SCI/TECH',
  ENVIRONMENT:    'ENVIRON',
  HEALTH:         'HEALTH',
  CRIME_SECURITY: 'CRIME',
  SPACE:          'SPACE',
}
