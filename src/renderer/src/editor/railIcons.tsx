/** Line icons from the design canvas (Main board rail, Projects and Settings boards), 24-unit paths. */
export const ICONS: Record<string, string> = {
  zooms: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l5 5M11 8v6M8 11h6',
  clips: 'M6 4h12v16H6zM6 9h12M6 14h12',
  cursor: 'M5 3l14 8-6 2-3 6z',
  scissors: 'M6 7a2.5 2.5 0 1 0 0 .01M6 17a2.5 2.5 0 1 0 0 .01M8.3 8.6L20 20M8.3 15.4L20 4M8.3 15.4l3.7-3.4',
  camera: 'M4 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4zM17 10l4-2v8l-4-2',
  background: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6',
  masks: 'M4 6h16v12H4zM8 10h4v4H8',
  shortcuts: 'M3 7h18v10H3zM7 11h1M11 11h1M15 11h1M7 14h10',
  captions: 'M4 5h16v14H4zM7 14h6M15 14h2M7 10h2M11 10h6',
  audio: 'M4 12h2M8 8v8M12 5v14M16 9v6M20 11v2',
  animations: 'M4 18c4-10 12-10 16 0M8 12l2-2M14 10l2 2',
  // Title bar
  aspect: 'M3 5h18v14H3z',
  crop: 'M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2',
  presets: 'M4 7h16M4 12h10M4 17h7',
  link: 'M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  copy: 'M8 8h12v12H8zM16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2',
  scrub: 'M3 12h2l2-5 3 10 3-8 2 3h2M19 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  tracks: 'M4 6h16M4 12h16M4 18h16M8 4v4M14 10v4M11 16v4',
  // Projects home
  recent: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  all: 'M4 6h16v12H4zM4 10h16',
  exports: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  close: 'M6 6l12 12M18 6L6 18'
}

export function Icon({ name, size = 18, filled = false }: { name: string; size?: number; filled?: boolean }): React.JSX.Element {
  return (
    <svg className="ic" viewBox="0 0 24 24" width={size} height={size} fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] ?? ''} />
    </svg>
  )
}
