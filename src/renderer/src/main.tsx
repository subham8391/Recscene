import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Notes } from './picker/Notes'
import { CameraPreview } from './picker/CameraPreview'
import { Picker } from './picker/Picker'
import { Widget } from './picker/Widget'
import { Settings } from './settings/Settings'
import './styles/tokens.css'
import './styles/app.css'
import './styles/picker.css'
import './styles/editor.css'
import './styles/home.css'
import './styles/settings.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

const route = window.location.hash.replace('#', '') || 'editor'
document.documentElement.dataset['route'] = route

// Appearance (Settings › General): the editor, home and settings follow the preference; overlays stay dark.
if (route === 'editor' || route === 'settings') {
  const apply = (appearance: unknown): void => {
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.dataset['theme'] = appearance === 'light' || appearance === 'dark' ? appearance : system
  }
  void window.recscene.prefs.get().then((raw) => apply(raw['appearance']))
  window.recscene.prefs.onChanged((s) => apply(s.appearance))
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => void window.recscene.prefs.get().then((raw) => apply(raw['appearance'])))
}

createRoot(root).render(<StrictMode>{route === 'picker' ? <Picker /> : route === 'widget' ? <Widget /> : route === 'notes' ? <Notes /> : route === 'campreview' ? <CameraPreview /> : route === 'settings' ? <Settings /> : <App />}</StrictMode>)
