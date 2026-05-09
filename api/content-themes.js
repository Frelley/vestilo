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

const ENTITY_THEME_MAP = {
  'harry-potter': ['fandom-core', 'movie-tv-core', 'dark-academia-core', 'nostalgia-2000s'],
  'disney': ['fandom-core', 'movie-tv-core', 'cartoon-core', 'nostalgia-2000s'],
  'marvel': ['fandom-core', 'movie-tv-core'],
  'dc': ['fandom-core', 'movie-tv-core'],
  'pokemon': ['fandom-core', 'anime-core', 'gaming-core', 'nostalgia-2000s'],
  'naruto': ['fandom-core', 'anime-core'],
  'dragon-ball': ['fandom-core', 'anime-core', 'nostalgia-90s'],
  'one-piece': ['fandom-core', 'anime-core'],
  'attack-on-titan': ['fandom-core', 'anime-core', 'soft-goth'],
  'hello-kitty': ['fandom-core', 'cartoon-core', 'girly-pink'],
  'barbie': ['fandom-core', 'movie-tv-core', 'girly-pink'],
  'friends': ['fandom-core', 'movie-tv-core', 'nostalgia-90s'],
  'gossip-girl': ['fandom-core', 'movie-tv-core', 'nostalgia-2000s'],
  'gilmore-girls': ['fandom-core', 'movie-tv-core', 'nostalgia-2000s', 'cottagecore'],
  'vampire-diaries': ['fandom-core', 'movie-tv-core', 'soft-goth', 'nostalgia-2000s'],
  'star-wars': ['fandom-core', 'movie-tv-core'],
  'rick-and-morty': ['fandom-core', 'cartoon-core', 'funny-chaotic'],
  'the-simpsons': ['fandom-core', 'cartoon-core', 'nostalgia-90s'],
  'looney-tunes': ['fandom-core', 'cartoon-core', 'nostalgia-90s'],
  'cartoon-network': ['fandom-core', 'cartoon-core', 'nostalgia-2000s'],
  'snoopy': ['fandom-core', 'cartoon-core', 'nostalgia-90s'],
  'mickey-mouse': ['fandom-core', 'cartoon-core', 'nostalgia-90s'],
  'stitch': ['fandom-core', 'cartoon-core', 'nostalgia-2000s'],
  'powerpuff-girls': ['fandom-core', 'cartoon-core', 'girly-pink', 'nostalgia-2000s'],
  'spider-man': ['fandom-core', 'movie-tv-core'],
  'batman': ['fandom-core', 'movie-tv-core', 'soft-goth'],
  'nirvana': ['music-merch-core', 'alt-grunge', 'nostalgia-90s'],
  'metallica': ['music-merch-core', 'alt-grunge'],
  'oasis': ['music-merch-core', 'concert-core', 'nostalgia-90s'],
  'bad-bunny': ['music-merch-core', 'concert-core', 'party-going-out'],
  'kendrick-lamar': ['music-merch-core', 'concert-core', 'streetwear-core'],
  'real-madrid': ['sports-core', 'football-core'],
  'barcelona': ['sports-core', 'football-core'],
  'manchester-united': ['sports-core', 'football-core'],
  'ferrari': ['sports-core'],
  'formula-1': ['sports-core'],
}

const AI_TAG_THEME_RULES = [
  { when: ['y2k'], add: ['y2k-core', 'nostalgia-2000s'] },
  { when: ['vintage', 'retro'], add: ['nostalgia-90s'] },
  { when: ['streetwear', 'urbano'], add: ['streetwear-core'] },
  { when: ['oversize', 'holgado', 'relajado', 'boxy'], add: ['oversize-comfy', 'streetwear-core'] },
  { when: ['hoodie', 'buzo', 'abrigado'], add: ['oversize-comfy'] },
  { when: ['gym', 'fitness', 'entrenamiento', 'deportivo', 'sporty', 'musculosa'], add: ['gym-bro'] },
  { when: ['coquette'], add: ['coquette-core', 'girly-pink'] },
  { when: ['minimalista', 'basica'], add: ['clean-girl-core'] },
  { when: ['elegante', 'formal', 'semi-formal'], add: ['dark-academia-core'] },
  { when: ['grunge', 'rock', 'punk', 'alternativo'], add: ['alt-grunge'] },
  { when: ['fiesta', 'noche', 'after-office', 'antro', 'carrete'], add: ['party-going-out'] },
  { when: ['musical', 'banda'], add: ['music-merch-core'] },
  { when: ['rosa', 'rosa-pastel', 'fucsia', 'coquette', 'femenino'], add: ['girly-pink'] },
  { when: ['negro', 'gris', 'morado', 'rock'], add: ['soft-goth'] },
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

export function inferContentThemeTags({ aiTags = [], contentEntities = [] } = {}) {
  const inferred = new Set()
  const tagSet = new Set(Array.isArray(aiTags) ? aiTags : [])

  for (const entity of (contentEntities || [])) {
    for (const theme of (ENTITY_THEME_MAP[entity] || [])) inferred.add(theme)
  }

  for (const rule of AI_TAG_THEME_RULES) {
    if (rule.when.some(tag => tagSet.has(tag))) {
      rule.add.forEach(theme => inferred.add(theme))
    }
  }

  if (tagSet.has('grafico') || tagSet.has('estampado') || tagSet.has('logotipo')) {
    if (tagSet.has('streetwear') || tagSet.has('oversize')) inferred.add('streetwear-core')
    if (tagSet.has('multicolor')) inferred.add('funny-chaotic')
  }

  if ((tagSet.has('beige') || tagSet.has('crema') || tagSet.has('blanco')) && (tagSet.has('minimalista') || tagSet.has('basica'))) {
    inferred.add('clean-girl-core')
  }

  if ((tagSet.has('negro') || tagSet.has('cafe') || tagSet.has('marron')) && (tagSet.has('vintage') || tagSet.has('formal') || tagSet.has('elegante'))) {
    inferred.add('dark-academia-core')
  }

  return toContentThemeTags([...inferred])
}

export function formatContentTag(tag) {
  if (!tag) return ''
  return tag
    .split('-')
    .map(part => part ? part[0].toUpperCase() + part.slice(1) : '')
    .join(' ')
}
