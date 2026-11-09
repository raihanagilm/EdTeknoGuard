import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Helper sinkronisasi scroll untuk Android WebView SwipeRefreshLayout
if (typeof window !== 'undefined') {
  let lastReportedAtTop = true

  const getScrollTopPosition = () => {
    // 1. Cek scroll window utama
    const winTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
    if (winTop > 4) return winTop

    // 2. Cek seluruh kontainer scroll internal yang terlihat aktif (.scroll-area)
    const scrollContainers = document.querySelectorAll('.scroll-area, [data-scroll-container], main[class*="overflow-y-auto"]')
    for (const container of scrollContainers) {
      if (container && container.offsetParent !== null) { // Elemen terlihat (visible)
        if (container.scrollTop > 4) {
          return container.scrollTop
        }
      }
    }
    return 0
  }

  const checkScrollState = () => {
    if (!window.AndroidBridge || typeof window.AndroidBridge.setScrollAtTop !== 'function') {
      return
    }
    const currentScroll = getScrollTopPosition()
    const isAtTop = currentScroll <= 4

    if (isAtTop !== lastReportedAtTop) {
      lastReportedAtTop = isAtTop
      try {
        window.AndroidBridge.setScrollAtTop(isAtTop)
      } catch (e) {
        // Abaikan jika bridge tidak tersedia
      }
    }
  }

  // Pasang pendengar event global tangkap (capture phase) untuk semua jenis interaksi scroll & touch
  window.addEventListener('scroll', checkScrollState, { passive: true, capture: true })
  window.addEventListener('touchmove', checkScrollState, { passive: true, capture: true })
  window.addEventListener('touchend', checkScrollState, { passive: true, capture: true })

  // Cek berkala secara ringan saat perpindahan tab / DOM update
  setInterval(checkScrollState, 250)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
