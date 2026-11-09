import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Helper sinkronisasi scroll untuk Android WebView SwipeRefreshLayout
if (typeof window !== 'undefined') {
  let lastReportedAtTop = true
  const checkScrollState = () => {
    if (!window.AndroidBridge || typeof window.AndroidBridge.setScrollAtTop !== 'function') {
      return
    }
    // Cek scroll window atau elemen scroll aktif
    const windowTop = window.scrollY <= 0 && document.documentElement.scrollTop <= 0 && document.body.scrollTop <= 0
    let subContainerTop = true
    const activeScrollArea = document.querySelector('.scroll-area, [data-scroll-container]')
    if (activeScrollArea) {
      subContainerTop = activeScrollArea.scrollTop <= 0
    }
    const isAtTop = windowTop && subContainerTop
    if (isAtTop !== lastReportedAtTop) {
      lastReportedAtTop = isAtTop
      try {
        window.AndroidBridge.setScrollAtTop(isAtTop)
      } catch (e) {
        // Abaikan jika bridge tidak tersedia
      }
    }
  }

  window.addEventListener('scroll', checkScrollState, { passive: true, capture: true })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
