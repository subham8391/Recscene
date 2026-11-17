/** The bundled wallpapers (spec 169): nine collections, 180 files under resources/backgrounds. */
export interface Wallpaper {
  collection: string
  name: string
  /** "<Collection>/<file>" without extension; the asset host adds .svg. */
  file: string
}

export const WALLPAPER_COLLECTIONS = ["Energy", "Glassmorphism", "Iridescent", "Midnight", "Radiant", "Raycast", "Spring", "Sunset", "macOS"] as const

export const WALLPAPERS: readonly Wallpaper[] = [
  {
    collection: "Energy",
    name: "Energy 1",
    file: "Energy/energy-1"
  },
  {
    collection: "Energy",
    name: "Energy 2",
    file: "Energy/energy-2"
  },
  {
    collection: "Energy",
    name: "Energy 3",
    file: "Energy/energy-3"
  },
  {
    collection: "Energy",
    name: "Energy 4",
    file: "Energy/energy-4"
  },
  {
    collection: "Energy",
    name: "Energy 5",
    file: "Energy/energy-5"
  },
  {
    collection: "Energy",
    name: "Energy 6",
    file: "Energy/energy-6"
  },
  {
    collection: "Energy",
    name: "Energy 7",
    file: "Energy/energy-7"
  },
  {
    collection: "Energy",
    name: "Energy 8",
    file: "Energy/energy-8"
  },
  {
    collection: "Energy",
    name: "Energy 9",
    file: "Energy/energy-9"
  },
  {
    collection: "Energy",
    name: "Energy 10",
    file: "Energy/energy-10"
  },
  {
    collection: "Energy",
    name: "Energy 11",
    file: "Energy/energy-11"
  },
  {
    collection: "Energy",
    name: "Energy 12",
    file: "Energy/energy-12"
  },
  {
    collection: "Energy",
    name: "Energy 13",
    file: "Energy/energy-13"
  },
  {
    collection: "Energy",
    name: "Energy 14",
    file: "Energy/energy-14"
  },
  {
    collection: "Energy",
    name: "Energy 15",
    file: "Energy/energy-15"
  },
  {
    collection: "Energy",
    name: "Energy 16",
    file: "Energy/energy-16"
  },
  {
    collection: "Energy",
    name: "Energy 17",
    file: "Energy/energy-17"
  },
  {
    collection: "Energy",
    name: "Energy 18",
    file: "Energy/energy-18"
  },
  {
    collection: "Energy",
    name: "Energy 19",
    file: "Energy/energy-19"
  },
  {
    collection: "Energy",
    name: "Energy 20",
    file: "Energy/energy-20"
  },
  {
    collection: "Energy",
    name: "Energy 21",
    file: "Energy/energy-21"
  },
  {
    collection: "Energy",
    name: "Energy 22",
    file: "Energy/energy-22"
  },
  {
    collection: "Energy",
    name: "Energy 23",
    file: "Energy/energy-23"
  },
  {
    collection: "Glassmorphism",
    name: "Glassmorphism 1",
    file: "Glassmorphism/glassmorphism-1"
  },
  {
    collection: "Glassmorphism",
    name: "Glassmorphism 2",
    file: "Glassmorphism/glassmorphism-2"
  },
  {
    collection: "Glassmorphism",
    name: "Glassmorphism 3",
    file: "Glassmorphism/glassmorphism-3"
  },
  {
    collection: "Glassmorphism",
    name: "Glassmorphism 4",
    file: "Glassmorphism/glassmorphism-4"
  },
  {
    collection: "Glassmorphism",
    name: "Glassmorphism 5",
    file: "Glassmorphism/glassmorphism-5"
  },
  {
    collection: "Glassmorphism",
    name: "Glassmorphism 6",
    file: "Glassmorphism/glassmorphism-6"
  },
  {
    collection: "Glassmorphism",
    name: "Glassmorphism 7",
    file: "Glassmorphism/glassmorphism-7"
  },
  {
    collection: "Glassmorphism",
    name: "Glassmorphism 8",
    file: "Glassmorphism/glassmorphism-8"
  },
  {
    collection: "Glassmorphism",
    name: "Glassmorphism 9",
    file: "Glassmorphism/glassmorphism-9"
  },
  {
    collection: "Glassmorphism",
    name: "Glassmorphism 10",
    file: "Glassmorphism/glassmorphism-10"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 1",
    file: "Iridescent/iridescent-1"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 2",
    file: "Iridescent/iridescent-2"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 3",
    file: "Iridescent/iridescent-3"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 4",
    file: "Iridescent/iridescent-4"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 5",
    file: "Iridescent/iridescent-5"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 6",
    file: "Iridescent/iridescent-6"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 7",
    file: "Iridescent/iridescent-7"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 8",
    file: "Iridescent/iridescent-8"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 9",
    file: "Iridescent/iridescent-9"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 10",
    file: "Iridescent/iridescent-10"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 11",
    file: "Iridescent/iridescent-11"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 12",
    file: "Iridescent/iridescent-12"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 13",
    file: "Iridescent/iridescent-13"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 14",
    file: "Iridescent/iridescent-14"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 15",
    file: "Iridescent/iridescent-15"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 16",
    file: "Iridescent/iridescent-16"
  },
  {
    collection: "Iridescent",
    name: "Iridescent 17",
    file: "Iridescent/iridescent-17"
  },
  {
    collection: "Midnight",
    name: "Midnight 1",
    file: "Midnight/midnight-1"
  },
  {
    collection: "Midnight",
    name: "Midnight 2",
    file: "Midnight/midnight-2"
  },
  {
    collection: "Midnight",
    name: "Midnight 3",
    file: "Midnight/midnight-3"
  },
  {
    collection: "Midnight",
    name: "Midnight 4",
    file: "Midnight/midnight-4"
  },
  {
    collection: "Midnight",
    name: "Midnight 5",
    file: "Midnight/midnight-5"
  },
  {
    collection: "Midnight",
    name: "Midnight 6",
    file: "Midnight/midnight-6"
  },
  {
    collection: "Midnight",
    name: "Midnight 7",
    file: "Midnight/midnight-7"
  },
  {
    collection: "Midnight",
    name: "Midnight 8",
    file: "Midnight/midnight-8"
  },
  {
    collection: "Midnight",
    name: "Midnight 9",
    file: "Midnight/midnight-9"
  },
  {
    collection: "Midnight",
    name: "Midnight 10",
    file: "Midnight/midnight-10"
  },
  {
    collection: "Midnight",
    name: "Midnight 11",
    file: "Midnight/midnight-11"
  },
  {
    collection: "Midnight",
    name: "Midnight 12",
    file: "Midnight/midnight-12"
  },
  {
    collection: "Midnight",
    name: "Midnight 13",
    file: "Midnight/midnight-13"
  },
  {
    collection: "Midnight",
    name: "Midnight 14",
    file: "Midnight/midnight-14"
  },
  {
    collection: "Midnight",
    name: "Midnight 15",
    file: "Midnight/midnight-15"
  },
  {
    collection: "Midnight",
    name: "Midnight 16",
    file: "Midnight/midnight-16"
  },
  {
    collection: "Midnight",
    name: "Midnight 17",
    file: "Midnight/midnight-17"
  },
  {
    collection: "Midnight",
    name: "Midnight 18",
    file: "Midnight/midnight-18"
  },
  {
    collection: "Radiant",
    name: "Radiant 1",
    file: "Radiant/radiant-1"
  },
  {
    collection: "Radiant",
    name: "Radiant 2",
    file: "Radiant/radiant-2"
  },
  {
    collection: "Radiant",
    name: "Radiant 3",
    file: "Radiant/radiant-3"
  },
  {
    collection: "Radiant",
    name: "Radiant 4",
    file: "Radiant/radiant-4"
  },
  {
    collection: "Radiant",
    name: "Radiant 5",
    file: "Radiant/radiant-5"
  },
  {
    collection: "Radiant",
    name: "Radiant 6",
    file: "Radiant/radiant-6"
  },
  {
    collection: "Radiant",
    name: "Radiant 7",
    file: "Radiant/radiant-7"
  },
  {
    collection: "Radiant",
    name: "Radiant 8",
    file: "Radiant/radiant-8"
  },
  {
    collection: "Radiant",
    name: "Radiant 9",
    file: "Radiant/radiant-9"
  },
  {
    collection: "Radiant",
    name: "Radiant 10",
    file: "Radiant/radiant-10"
  },
  {
    collection: "Radiant",
    name: "Radiant 11",
    file: "Radiant/radiant-11"
  },
  {
    collection: "Radiant",
    name: "Radiant 12",
    file: "Radiant/radiant-12"
  },
  {
    collection: "Radiant",
    name: "Radiant 13",
    file: "Radiant/radiant-13"
  },
  {
    collection: "Radiant",
    name: "Radiant 14",
    file: "Radiant/radiant-14"
  },
  {
    collection: "Radiant",
    name: "Radiant 15",
    file: "Radiant/radiant-15"
  },
  {
    collection: "Radiant",
    name: "Radiant 16",
    file: "Radiant/radiant-16"
  },
  {
    collection: "Radiant",
    name: "Radiant 17",
    file: "Radiant/radiant-17"
  },
  {
    collection: "Radiant",
    name: "Radiant 18",
    file: "Radiant/radiant-18"
  },
  {
    collection: "Radiant",
    name: "Radiant 19",
    file: "Radiant/radiant-19"
  },
  {
    collection: "Radiant",
    name: "Radiant 20",
    file: "Radiant/radiant-20"
  },
  {
    collection: "Raycast",
    name: "Autumnal Peach",
    file: "Raycast/autumnal-peach"
  },
  {
    collection: "Raycast",
    name: "Blob",
    file: "Raycast/blob"
  },
  {
    collection: "Raycast",
    name: "Blob Red",
    file: "Raycast/blob-red"
  },
  {
    collection: "Raycast",
    name: "Blossom",
    file: "Raycast/blossom"
  },
  {
    collection: "Raycast",
    name: "Blue Distortion 1",
    file: "Raycast/blue-distortion-1"
  },
  {
    collection: "Raycast",
    name: "Blue Distortion 2",
    file: "Raycast/blue-distortion-2"
  },
  {
    collection: "Raycast",
    name: "Blushing Fire",
    file: "Raycast/blushing-fire"
  },
  {
    collection: "Raycast",
    name: "Bright Rain",
    file: "Raycast/bright-rain"
  },
  {
    collection: "Raycast",
    name: "Chromatic Dark 1",
    file: "Raycast/chromatic-dark-1"
  },
  {
    collection: "Raycast",
    name: "Chromatic Dark 2",
    file: "Raycast/chromatic-dark-2"
  },
  {
    collection: "Raycast",
    name: "Chromatic Light 1",
    file: "Raycast/chromatic-light-1"
  },
  {
    collection: "Raycast",
    name: "Chromatic Light 2",
    file: "Raycast/chromatic-light-2"
  },
  {
    collection: "Raycast",
    name: "Cube Mono",
    file: "Raycast/cube-mono"
  },
  {
    collection: "Raycast",
    name: "Cube Prod",
    file: "Raycast/cube-prod"
  },
  {
    collection: "Raycast",
    name: "Floss",
    file: "Raycast/floss"
  },
  {
    collection: "Raycast",
    name: "Glass Rainbow",
    file: "Raycast/glass-rainbow"
  },
  {
    collection: "Raycast",
    name: "Good Vibes",
    file: "Raycast/good-vibes"
  },
  {
    collection: "Raycast",
    name: "Loupe",
    file: "Raycast/loupe"
  },
  {
    collection: "Raycast",
    name: "Loupe Mono Dark",
    file: "Raycast/loupe-mono-dark"
  },
  {
    collection: "Raycast",
    name: "Loupe Mono Light",
    file: "Raycast/loupe-mono-light"
  },
  {
    collection: "Raycast",
    name: "Mono Dark Distortion 1",
    file: "Raycast/mono-dark-distortion-1"
  },
  {
    collection: "Raycast",
    name: "Mono Dark Distortion 2",
    file: "Raycast/mono-dark-distortion-2"
  },
  {
    collection: "Raycast",
    name: "Mono Light Distortion 1",
    file: "Raycast/mono-light-distortion-1"
  },
  {
    collection: "Raycast",
    name: "Mono Light Distortion 2",
    file: "Raycast/mono-light-distortion-2"
  },
  {
    collection: "Raycast",
    name: "Moonrise",
    file: "Raycast/moonrise"
  },
  {
    collection: "Raycast",
    name: "Ray Of Lights",
    file: "Raycast/ray-of-lights"
  },
  {
    collection: "Raycast",
    name: "Red Distortion 1",
    file: "Raycast/red-distortion-1"
  },
  {
    collection: "Raycast",
    name: "Red Distortion 2",
    file: "Raycast/red-distortion-2"
  },
  {
    collection: "Raycast",
    name: "Red Distortion 3",
    file: "Raycast/red-distortion-3"
  },
  {
    collection: "Raycast",
    name: "Red Distortion 4",
    file: "Raycast/red-distortion-4"
  },
  {
    collection: "Raycast",
    name: "Rose Thorn",
    file: "Raycast/rose-thorn"
  },
  {
    collection: "Spring",
    name: "Spring 1",
    file: "Spring/spring-1"
  },
  {
    collection: "Spring",
    name: "Spring 2",
    file: "Spring/spring-2"
  },
  {
    collection: "Spring",
    name: "Spring 3",
    file: "Spring/spring-3"
  },
  {
    collection: "Spring",
    name: "Spring 4",
    file: "Spring/spring-4"
  },
  {
    collection: "Spring",
    name: "Spring 5",
    file: "Spring/spring-5"
  },
  {
    collection: "Spring",
    name: "Spring 6",
    file: "Spring/spring-6"
  },
  {
    collection: "Spring",
    name: "Spring 7",
    file: "Spring/spring-7"
  },
  {
    collection: "Spring",
    name: "Spring 8",
    file: "Spring/spring-8"
  },
  {
    collection: "Spring",
    name: "Spring 9",
    file: "Spring/spring-9"
  },
  {
    collection: "Spring",
    name: "Spring 10",
    file: "Spring/spring-10"
  },
  {
    collection: "Spring",
    name: "Spring 11",
    file: "Spring/spring-11"
  },
  {
    collection: "Spring",
    name: "Spring 12",
    file: "Spring/spring-12"
  },
  {
    collection: "Spring",
    name: "Spring 13",
    file: "Spring/spring-13"
  },
  {
    collection: "Spring",
    name: "Spring 14",
    file: "Spring/spring-14"
  },
  {
    collection: "Spring",
    name: "Spring 15",
    file: "Spring/spring-15"
  },
  {
    collection: "Spring",
    name: "Spring 16",
    file: "Spring/spring-16"
  },
  {
    collection: "Spring",
    name: "Spring 17",
    file: "Spring/spring-17"
  },
  {
    collection: "Spring",
    name: "Spring 18",
    file: "Spring/spring-18"
  },
  {
    collection: "Spring",
    name: "Spring 19",
    file: "Spring/spring-19"
  },
  {
    collection: "Spring",
    name: "Spring 20",
    file: "Spring/spring-20"
  },
  {
    collection: "Spring",
    name: "Spring 21",
    file: "Spring/spring-21"
  },
  {
    collection: "Spring",
    name: "Spring 22",
    file: "Spring/spring-22"
  },
  {
    collection: "Spring",
    name: "Spring 23",
    file: "Spring/spring-23"
  },
  {
    collection: "Spring",
    name: "Spring 24",
    file: "Spring/spring-24"
  },
  {
    collection: "Sunset",
    name: "Sunset 1",
    file: "Sunset/sunset-1"
  },
  {
    collection: "Sunset",
    name: "Sunset 2",
    file: "Sunset/sunset-2"
  },
  {
    collection: "Sunset",
    name: "Sunset 3",
    file: "Sunset/sunset-3"
  },
  {
    collection: "Sunset",
    name: "Sunset 4",
    file: "Sunset/sunset-4"
  },
  {
    collection: "Sunset",
    name: "Sunset 5",
    file: "Sunset/sunset-5"
  },
  {
    collection: "Sunset",
    name: "Sunset 6",
    file: "Sunset/sunset-6"
  },
  {
    collection: "Sunset",
    name: "Sunset 7",
    file: "Sunset/sunset-7"
  },
  {
    collection: "Sunset",
    name: "Sunset 8",
    file: "Sunset/sunset-8"
  },
  {
    collection: "Sunset",
    name: "Sunset 9",
    file: "Sunset/sunset-9"
  },
  {
    collection: "Sunset",
    name: "Sunset 10",
    file: "Sunset/sunset-10"
  },
  {
    collection: "Sunset",
    name: "Sunset 11",
    file: "Sunset/sunset-11"
  },
  {
    collection: "Sunset",
    name: "Sunset 12",
    file: "Sunset/sunset-12"
  },
  {
    collection: "Sunset",
    name: "Sunset 13",
    file: "Sunset/sunset-13"
  },
  {
    collection: "Sunset",
    name: "Sunset 14",
    file: "Sunset/sunset-14"
  },
  {
    collection: "Sunset",
    name: "Sunset 15",
    file: "Sunset/sunset-15"
  },
  {
    collection: "Sunset",
    name: "Sunset 16",
    file: "Sunset/sunset-16"
  },
  {
    collection: "Sunset",
    name: "Sunset 17",
    file: "Sunset/sunset-17"
  },
  {
    collection: "Sunset",
    name: "Sunset 18",
    file: "Sunset/sunset-18"
  },
  {
    collection: "Sunset",
    name: "Sunset 19",
    file: "Sunset/sunset-19"
  },
  {
    collection: "Sunset",
    name: "Sunset 20",
    file: "Sunset/sunset-20"
  },
  {
    collection: "Sunset",
    name: "Sunset 21",
    file: "Sunset/sunset-21"
  },
  {
    collection: "macOS",
    name: "iPad 17 Dark",
    file: "macOS/ipad-17-dark"
  },
  {
    collection: "macOS",
    name: "iPad 17 Light",
    file: "macOS/ipad-17-light"
  },
  {
    collection: "macOS",
    name: "Sequoia Blue",
    file: "macOS/sequoia-blue"
  },
  {
    collection: "macOS",
    name: "Sequoia Blue Orange",
    file: "macOS/sequoia-blue-orange"
  },
  {
    collection: "macOS",
    name: "Sonoma Clouds",
    file: "macOS/sonoma-clouds"
  },
  {
    collection: "macOS",
    name: "Sonoma Dark",
    file: "macOS/sonoma-dark"
  },
  {
    collection: "macOS",
    name: "Sonoma Evening",
    file: "macOS/sonoma-evening"
  },
  {
    collection: "macOS",
    name: "Sonoma From Above",
    file: "macOS/sonoma-from-above"
  },
  {
    collection: "macOS",
    name: "Sonoma Horizon",
    file: "macOS/sonoma-horizon"
  },
  {
    collection: "macOS",
    name: "Sonoma Light",
    file: "macOS/sonoma-light"
  },
  {
    collection: "macOS",
    name: "Sonoma River",
    file: "macOS/sonoma-river"
  },
  {
    collection: "macOS",
    name: "Tahoe Dark",
    file: "macOS/tahoe-dark"
  },
  {
    collection: "macOS",
    name: "Tahoe Light",
    file: "macOS/tahoe-light"
  },
  {
    collection: "macOS",
    name: "Ventura",
    file: "macOS/ventura"
  },
  {
    collection: "macOS",
    name: "Ventura Dark",
    file: "macOS/ventura-dark"
  },
  {
    collection: "macOS",
    name: "Ventura Semi Dark",
    file: "macOS/ventura-semi-dark"
  }
]
