import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import './fonts.css'
import './index.css'

const MainWindow = lazy(() => import('./windows/MainWindow'))
const DockWindow = lazy(() => import('./windows/DockWindow'))
const ClipboardWindow = lazy(() => import('./windows/ClipboardWindow'))

const hash = window.location.hash
const isDock = hash === '#/dock' || hash === '#dock'
const isClipboard = hash === '#/clipboard' || hash === '#clipboard'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      {isClipboard ? <ClipboardWindow /> : isDock ? <DockWindow /> : <MainWindow />}
    </Suspense>
  </React.StrictMode>
)
