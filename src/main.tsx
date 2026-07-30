import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import MainWindow from './windows/MainWindow'
import DockWindow from './windows/DockWindow'

const hash = window.location.hash

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {hash === '#/dock' || hash === '#dock' ? <DockWindow /> : <MainWindow />}
  </React.StrictMode>
)
