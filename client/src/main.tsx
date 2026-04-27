import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const isPopout = new URLSearchParams(window.location.search).has('popout')

async function boot() {
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  if (isPopout) {
    const { default: PopoutPage } = await import('./PopoutPage')
    root.render(<React.StrictMode><PopoutPage /></React.StrictMode>)
  } else {
    const { default: App } = await import('./App')
    root.render(<React.StrictMode><App /></React.StrictMode>)
  }
}

boot()
