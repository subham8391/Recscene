/** Editor layout states (spec 72). */
export type LayoutState = 'edit' | 'hide-sidebar' | 'hide-timeline' | 'preview'

export const showsSidebar = (s: LayoutState): boolean => s === 'edit' || s === 'hide-timeline'
export const showsTimeline = (s: LayoutState): boolean => s === 'edit' || s === 'hide-sidebar'

export function toggleSidebar(s: LayoutState): LayoutState {
  return ({ edit: 'hide-sidebar', 'hide-sidebar': 'edit', preview: 'hide-timeline', 'hide-timeline': 'preview' } as const)[s]
}

export function toggleTimeline(s: LayoutState): LayoutState {
  return ({ edit: 'hide-timeline', 'hide-timeline': 'edit', preview: 'hide-sidebar', 'hide-sidebar': 'preview' } as const)[s]
}

export function togglePreview(s: LayoutState): LayoutState {
  return s === 'preview' ? 'edit' : 'preview'
}
