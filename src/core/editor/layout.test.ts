import { describe, expect, it } from 'vitest'
import { showsSidebar, showsTimeline, togglePreview, toggleSidebar, toggleTimeline } from './layout'

describe('layout', () => {
  it('toggles each part and derives visibility', () => {
    expect(toggleSidebar('edit')).toBe('hide-sidebar')
    expect(toggleSidebar('preview')).toBe('hide-timeline')
    expect(toggleTimeline('hide-sidebar')).toBe('preview')
    expect(togglePreview('edit')).toBe('preview')
    expect(togglePreview('preview')).toBe('edit')
    expect(showsSidebar('hide-timeline')).toBe(true)
    expect(showsTimeline('hide-timeline')).toBe(false)
    expect(showsSidebar('preview')).toBe(false)
  })
})
