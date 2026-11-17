import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Notes } from './picker/Notes'
import { Picker } from './picker/Picker'
import { Widget } from './picker/Widget'
import './styles/tokens.css'
import './styles/app.css'
import './styles/picker.css'
import './styles/editor.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

const route = window.location.hash.replace('#', '') || 'editor'
document.documentElement.dataset['route'] = route

createRoot(root).render(<StrictMode>{route === 'picker' ? <Picker /> : route === 'widget' ? <Widget /> : route === 'notes' ? <Notes /> : <App />}</StrictMode>)
