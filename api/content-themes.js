/**
 * VESTILO - Content Theme Dictionary
 *
 * Separate from search tags. These labels group products into reusable
 * short-form content buckets for reels, TikToks, and themed drops.
 */

export const CONTENT_THEME_TAGS = [
  'nostalgia-90s',
  'nostalgia-2000s',
  'cartoon-core',
  'anime-core',
  'fandom-core',
  'movie-tv-core',
  'music-merch-core',
  'concert-core',
  'sports-core',
  'football-core',
  'gaming-core',
  'streetwear-core',
  'y2k-core',
  'coquette-core',
  'clean-girl-core',
  'dark-academia-core',
  'cottagecore',
  'soft-goth',
  'girly-pink',
  'alt-grunge',
  'oversize-comfy',
  'gym-bro',
  'party-going-out',
  'funny-chaotic',
]

export const CONTENT_ENTITY_TAGS = [
  'harry-potter',
  'disney',
  'marvel',
  'dc',
  'pokemon',
  'naruto',
  'dragon-ball',
  'one-piece',
  'attack-on-titan',
  'hello-kitty',
  'barbie',
  'friends',
  'gossip-girl',
  'gilmore-girls',
  'vampire-diaries',
  'star-wars',
  'rick-and-morty',
  'the-simpsons',
  'looney-tunes',
  'cartoon-network',
  'snoopy',
  'mickey-mouse',
  'stitch',
  'powerpuff-girls',
  'spider-man',
  'batman',
  'nirvana',
  'metallica',
  'oasis',
  'bad-bunny',
  'kendrick-lamar',
  'real-madrid',
  'barcelona',
  'manchester-united',
  'ferrari',
  'formula-1',
]

const CONTENT_TAG_ALIASES = {
  // themes
  '90s': 'nostalgia-90s',
  '90s-core': 'nostalgia-90s',
  'retro-90s': 'nostalgia-90s',
  '2000s': 'nostalgia-2000s',
  'y2k-nostalgia': 'nostalgia-2000s',
  'cartoons': 'cartoon-core',
  'anime': 'anime-core',
  'fandom': 'fandom-core',
  'tv-movies': 'movie-tv-core',
  'movie-core': 'movie-tv-core',
  'band-tees': 'music-merch-core',
  'bands': 'music-merch-core',
  'concert': 'concert-core',
  'sports': 'sports-core',
  'football': 'football-core',
  'gaming': 'gaming-core',
  'streetwear': 'streetwear-core',
  'y2k': 'y2k-core',
  'coquette': 'coquette-core',
  'clean-girl': 'clean-girl-core',
  'dark-academia': 'dark-academia-core',
  'girly': 'girly-pink',
  'pink-girly': 'girly-pink',
  'grunge': 'alt-grunge',
  'oversize': 'oversize-comfy',
  'comfy': 'oversize-comfy',
  'gym': 'gym-bro',
  'going-out': 'party-going-out',
  'party': 'party-going-out',
  'funny': 'funny-chaotic',

  // entities
  'harry potter': 'harry-potter',
  'dragon ball': 'dragon-ball',
  'hello kitty': 'hello-kitty',
  'rick and morty': 'rick-and-morty',
  'the simpsons': 'the-simpsons',
  'looney tunes': 'looney-tunes',
  'cartoon network': 'cartoon-network',
  'mickey mouse': 'mickey-mouse',
  'powerpuff girls': 'powerpuff-girls',
  'spiderman': 'spider-man',
  'spider man': 'spider-man',
  'bad bunny': 'bad-bunny',
  'kendrick': 'kendrick-lamar',
  'real madrid': 'real-madrid',
  'manchester united': 'manchester-united',
  'formula 1': 'formula-1',
  'f1': 'formula-1',
}

function normalizeContentTag(tag) {
  if (!tag || typeof tag !== 'string') return ''
  return tag
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toContentTag(raw, allowed) {
  const normalized = normalizeContentTag(raw)
  if (!normalized) return null
  if (allowed.includes(normalized)) return normalized
  const alias = CONTENT_TAG_ALIASES[normalized]
  if (alias && allowed.includes(alias)) return alias
  return null
}

function dedupeContentTags(tags, allowed) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map(tag => toContentTag(tag, allowed)).filter(Boolean))]
}

export function toContentThemeTags(tags) {
  return dedupeContentTags(tags, CONTENT_THEME_TAGS)
}

export function toContentEntityTags(tags) {
  return dedupeContentTags(tags, CONTENT_ENTITY_TAGS)
}

export function formatContentTag(tag) {
  if (!tag) return ''
  return tag
    .split('-')
    .map(part => part ? part[0].toUpperCase() + part.slice(1) : '')
    .join(' ')
}
