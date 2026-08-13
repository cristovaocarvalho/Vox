import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const MainWindow = lazy(() => import('./windows/MainWindow'))
const DockWindow = lazy(() => import('./windows/DockWindow'))

const hash = window.location.hash
const isDock = hash === '#/dock' || hash === '#dock'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      {isDock ? <DockWindow /> : <MainWindow />}
    </Suspense>
  </React.StrictMode>
)
