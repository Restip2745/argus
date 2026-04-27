import type { Config } from 'tailwindcss'

export default {
  content: ['./client/index.html', './client/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Terra Invicta dark UI palette
        'argus-bg':      '#080c14',
        'argus-panel':   '#0d1520',
        'argus-border':  '#1e3a5f',
        'argus-accent':  '#00c8ff',
        'argus-warn':    '#ff6b35',
        'argus-ok':      '#39ff14',
        'argus-dim':     '#4a6fa5',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
