/**
 * VESTILO - Shared Tag Dictionary
 *
 * Single source of truth for all tag vocabulary.
 * Used by both analyze-product.js (AI tagging) and search.js (query parsing).
 *
 * Architecture:
 *   CANONICAL_TAGS   — master list; the ONLY tags stored in ai_tags
 *   SYNONYMS         — maps any variant → its canonical form
 *   SEMANTIC_GROUPS  — related canonical tags that should co-match in search
 *   Helper functions — normalization, fuzzy matching, expansion, scoring
 */

// ─────────────────────────────────────────────────────────────────────────────
// LEVENSHTEIN — used internally by toCanonical for typo tolerance
// ─────────────────────────────────────────────────────────────────────────────

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const curr = [i]
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1])
    }
    prev = curr
  }
  return prev[n]
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL TAGS — the ONLY values stored in Supabase ai_tags
// ─────────────────────────────────────────────────────────────────────────────

export const CANONICAL_TAGS = [
  // ── GARMENT TYPE ──────────────────────────────────────────────────────────
  'camiseta', 'musculosa', 'top', 'camisa', 'hoodie', 'buzo',

  // ── FIT / CORTE ───────────────────────────────────────────────────────────
  'oversize', 'holgado', 'slim-fit', 'ajustado', 'entallado', 'regular',
  'relajado', 'justo', 'estandar', 'wide', 'boxy',

  // ── COLORS ────────────────────────────────────────────────────────────────
  'negro', 'blanco', 'gris', 'azul', 'azul-marino', 'azul-rey', 'azul-electrico',
  'rojo', 'rojo-vino', 'verde', 'verde-esmeralda', 'verde-menta', 'verde-oliva',
  'amarillo', 'dorado', 'cafe', 'marron', 'naranja', 'rosa', 'rosa-pastel',
  'fucsia', 'morado', 'violeta', 'lila', 'lavanda', 'beige', 'crema',
  'multicolor', 'blanco-roto', 'negro-carbon',

  // ── STYLE / AESTHETIC ─────────────────────────────────────────────────────
  'basica', 'vintage', 'retro', 'streetwear', 'urbano', 'y2k', 'boho',
  'bohemio', 'minimalista', 'grunge', 'preppy', 'coquette', 'sporty',
  'cottagecore', 'elegante', 'formal', 'semi-formal', 'hipster',
  'rock', 'punk', 'alternativo', 'artistico', 'femenino', 'masculino',
  'andino', 'tropical', 'nordico', 'japones',

  // ── PATTERN / DESIGN ──────────────────────────────────────────────────────
  'liso', 'estampado', 'grafico', 'tie-dye', 'franjas', 'rayas',
  'bordado', 'mensaje', 'texto', 'banda', 'musical', 'logotipo',
  'floral', 'geometrico', 'animal-print', 'camuflaje', 'paisley',
  'abstracto', 'lettering',

  // ── MATERIAL ──────────────────────────────────────────────────────────────
  'algodon', 'algodon-puro', 'lino', 'mezclilla', 'denim', 'licra',
  'stretch', 'elastico', 'organico', 'sostenible', 'poliester', 'sintetico',
  'terciopelo', 'gamuza', 'franela', 'jersey', 'pique', 'microfibra', 'suave',

  // ── NECKLINE ──────────────────────────────────────────────────────────────
  'cuello-redondo', 'cuello-v', 'cuello-polo', 'cuello-tortuga', 'henley',
  'sin-cuello', 'escote-cuadrado', 'escote-ovalado',

  // ── SLEEVES ───────────────────────────────────────────────────────────────
  'manga-corta', 'manga-larga', 'manga-3/4', 'sin-mangas', 'tirantes',

  // ── LENGTH ────────────────────────────────────────────────────────────────
  'crop', 'corto', 'largo', 'extendida', 'asimetrico',

  // ── OCCASION ──────────────────────────────────────────────────────────────
  'casual', 'hogar', 'relax', 'diario', 'trabajo', 'oficina', 'fiesta',
  'noche', 'social', 'deportivo', 'gym', 'fitness', 'entrenamiento',
  'estudiante', 'playa', 'piscina', 'iglesia', 'especial', 'fecha',
  'cena', 'after-office', 'carrete', 'antro',

  // ── SEASON / CLIMATE ──────────────────────────────────────────────────────
  'verano', 'invierno', 'todo-tempo', 'fresco', 'abrigado', 'primavera',
  'otono', 'caliente', 'frio',

  // ── GENDER ────────────────────────────────────────────────────────────────
  'mujer', 'hombre', 'unisex', 'ninos', 'ninas', 'adulto-mayor', 'junior', 'teen',

  // ── SPECIAL ───────────────────────────────────────────────────────────────
  'edicion-limitada', 'premium', 'economico', 'oferta', 'unico', 'exclusivo',
  'coleccionable', 'raro', 'importado', 'local',

  // ── BRANDS ────────────────────────────────────────────────────────────────
  'nike', 'adidas', 'puma', 'reebok', 'levis', 'zara', 'hm', 'gap',
  'hollister', 'abercrombie', 'supreme', 'jordan', 'champion', 'converse',
  'vans', 'quicksilver', 'billabong', 'rip-curl', 'carhartt', 'columbia',
  'the-north-face', 'patagonia', 'guess', 'lacoste', 'polo-ralph-lauren',
  'tommy-hilfiger', 'calvin-klein', 'boss', 'g-star', 'dickies', 'obey',
  'stussy', 'bape', 'off-white', 'palm-angels', 'stone-island', 'balenciaga',

  // ── DETAILS / FEATURES ────────────────────────────────────────────────────
  'botones', 'cierre', 'cremallera', 'cordon', 'capucha', 'bolsillo',
  'doble-costura', 'etiqueta-exterior', 'texture', 'relieve',
  'perlas', 'strass', 'glow-in-dark',
]

// ─────────────────────────────────────────────────────────────────────────────
// SYNONYMS — maps any variant → canonical form
// Rules: no self-maps, all values must exist in CANONICAL_TAGS
// ─────────────────────────────────────────────────────────────────────────────

export const SYNONYMS = {
  // ── Garment Type ──────────────────────────────────────────────────────────
  'remera':            'camiseta',
  'playera':           'camiseta',
  'polera':            'camiseta',
  'playera-deportiva': 'camiseta',
  'tshirt':            'camiseta',
  't-shirt':           'camiseta',
  'tee':               'camiseta',
  'blusa':             'top',
  'musclo':            'musculosa',
  'undershirt':        'musculosa',
  'sudadera':          'hoodie',
  'sueter':            'hoodie',
  'sweatshirt':        'hoodie',
  'campera':           'hoodie',
  'chompa':            'buzo',
  'shirt':             'camisa',
  'camisa-formal':     'camisa',
  'camisa-casual':     'camisa',

  // ── Fit ───────────────────────────────────────────────────────────────────
  'oversized':    'oversize',
  'over-size':    'oversize',
  'holgada':      'holgado',
  'holgadita':    'holgado',
  'suelto':       'holgado',
  'suelta':       'holgado',
  'grande':       'oversize',
  'big':          'oversize',
  'fit':          'slim-fit',
  'slim':         'slim-fit',
  'skinny':       'slim-fit',
  'tight':        'ajustado',
  'ajustada':     'ajustado',
  'ajustadita':   'ajustado',
  'entallada':    'entallado',
  'entalladito':  'entallado',
  'normal':       'regular',
  'standard':     'regular',
  'relax':        'relajado',
  'comodo':       'relajado',
  'suavecita':    'relajado',
  'justito':      'justo',

  // ── Colors ────────────────────────────────────────────────────────────────
  // blacks & whites
  'black':          'negro',
  'oscuro':         'negro',
  'negra':          'negro',
  'negro-mate':     'negro-carbon',
  'white':          'blanco',
  'blanca':         'blanco',
  'blanquita':      'blanco',
  'blanco-nuclear': 'blanco-roto',
  // greys
  'gray':         'gris',
  'grey':         'gris',
  'plomo':        'gris',
  'ceniza':       'gris',
  'grafito':      'gris',
  'plata':        'gris',
  'plateado':     'gris',
  'gris-oxford':  'gris',
  // blues
  'celeste':        'azul',
  'azul-baby':      'azul',
  'azulito':        'azul',
  'navy':           'azul-marino',
  'marino':         'azul-marino',
  'azul marino':    'azul-marino',
  'royal':          'azul-rey',
  'royal-blue':     'azul-rey',
  'azul-intenso':   'azul-electrico',
  // reds
  'roja':          'rojo',
  'rojo-vivo':     'rojo',
  'rojo-intenso':  'rojo',
  'rojo-claro':    'rojo',
  'carmin':        'rojo',
  'rojo-carbon':   'rojo',
  'vino':          'rojo-vino',
  'Vino':          'rojo-vino',
  'burgundy':      'rojo-vino',
  'rojo-burgundy': 'rojo-vino',
  'rojo-pasado':   'rojo-vino',
  // greens
  'verde-manzana':       'verde',
  'verde-bosque':        'verde',
  'verde-fluor':         'verde',
  'verde-neon':          'verde',
  'esmeralda':           'verde-esmeralda',
  'menta':               'verde-menta',
  'verde-menta-pastel':  'verde-menta',
  'oliva':               'verde-oliva',
  'verde-oliva-militar': 'verde-oliva',
  'kaki':                'verde-oliva',
  // yellows / golds
  'amarilla':       'amarillo',
  'mostaza':        'amarillo',
  'amarillo-claro': 'amarillo',
  'amarillo-pastel':'amarillo',
  'gold':           'dorado',
  // browns
  'cafe-con-leche': 'cafe',
  'suela':          'cafe',
  'bronce':         'cafe',
  'marron-oscuro':  'marron',
  'chocolate':      'marron',
  // oranges / pinks
  'naranja-claro':   'naranja',
  'naranja-fluor':   'naranja',
  'coral':           'naranja',
  'terracotta':      'naranja',
  'durazno':         'naranja',
  'morada':          'morado',
  'purpura':         'morado',
  'morado-oscuro':   'morado',
  'rosada':          'rosa',
  'salmon':          'rosa-pastel',
  'rosa-claro':      'rosa-pastel',
  'rosa-chicle':     'fucsia',
  'rosa-electrico':  'fucsia',
  'magenta':         'fucsia',
  // purples
  'lila-claro':   'lila',
  // beiges / creams
  'beige-claro':  'beige',
  'beige-oscuro': 'beige',
  'arena':        'beige',
  'crudo':        'crema',
  'cremita':      'crema',
  'champagne':    'crema',
  // misc
  'colorido':   'multicolor',
  'arcoiris':   'multicolor',
  'rainbow':    'multicolor',
  'color':      'multicolor',
  'blanco-oxy': 'blanco',

  // ── Style ─────────────────────────────────────────────────────────────────
  'sencilla':   'basica',
  'basico':     'basica',
  'simple':     'basica',
  'clasica':    'vintage',
  'clasico':    'retro',
  'callejero':  'streetwear',
  'hip-hop':    'streetwear',
  'rap':        'streetwear',
  'hype':       'streetwear',
  'hypebeast':  'streetwear',
  'cool':       'streetwear',
  'chill':      'casual',
  'everyday':   'casual',
  'dia-a-dia':  'casual',
  'cotidiano':  'casual',
  'informal':   'casual',
  'lindo':      'coquette',
  'sweet':      'coquette',
  'femenina':   'femenino',
  'para-ella':  'femenino',
  'de-ella':    'femenino',
  'girl':       'femenino',
  'varon':      'masculino',
  'man':        'masculino',
  'boy':        'masculino',
  'para-todos': 'unisex',
  'sport':      'sporty',
  'y2k':        'y2k',
  '2000s':      'y2k',
  '2000':       'y2k',
  'noventera':  'retro',
  'ochentera':  'retro',
  'setentera':  'retro',

  // ── Occasion ──────────────────────────────────────────────────────────────
  'festivo':    'fiesta',
  'nochero':    'noche',
  'antros':     'antro',
  'salida':     'noche',
  'farra':      'carrete',
  'joda':       'carrete',
  'juntar':     'social',
  'cumple':     'fiesta',
  'graduacion': 'especial',
  'boda':       'formal',
  'entrevista': 'semi-formal',
  'trabajo':    'oficina',
  'oficin':     'oficina',
  'sermons':    'iglesia',
  'religioso':  'iglesia',
  'capilla':    'iglesia',
  'culto':      'iglesia',
  'dias':       'diario',
  'diarias':    'diario',
  'tareas':     'estudiante',
  'universidad':'estudiante',
  'escuela':    'estudiante',
  'colegio':    'estudiante',
  'casa':       'hogar',
  'interior':   'hogar',
  'dormir':     'hogar',
  'alberca':    'piscina',
  'mar':        'playa',
  'surf':       'playa',
  'surfista':   'playa',
  'baile':      'fiesta',
  'baillar':    'fiesta',
  'gala':       'formal',
  'cocktail':   'fiesta',
  'coctel':     'fiesta',
  'gimnasio':   'gym',
  'running':    'deportivo',
  'corriendo':  'deportivo',
  'fitness':    'fitness',
  'after':      'after-office',

  // ── Season ────────────────────────────────────────────────────────────────
  'todo-tiempo':  'todo-tempo',
  'cuatro-estaciones': 'todo-tempo',
  'primaveral':   'primavera',
  'invernal':     'invierno',
  'calor':          'fresco',   // searching "para el calor" = wants cool/breathable
  'calorcito':      'fresco',
  'para-el-calor':  'fresco',
  'hace-calor':     'fresco',
  'calurosa':       'fresco',
  'caluroso':       'fresco',
  'ligera':         'fresco',
  'ligero':         'fresco',
  'liviana':        'fresco',
  'liviano':        'fresco',
  'fresquita':      'fresco',
  'fresquito':      'fresco',
  'frescura':       'fresco',
  'fresh':          'fresco',
  'respirable':     'fresco',
  'transpirable':   'fresco',
  'seco':           'fresco',
  'veranito':       'verano',
  'veraniego':      'verano',
  'abrigada':       'abrigado',

  // ── Pattern ───────────────────────────────────────────────────────────────
  'prints':            'estampado',
  'print':             'estampado',
  'lisa':              'liso',
  'lisita':            'liso',
  'sin-estampado':     'liso',
  'liso-total':        'liso',
  'solido':            'liso',
  'dye':               'tie-dye',
  'degradado':         'tie-dye',
  'gradient':          'tie-dye',
  'rayitas':           'rayas',
  'striped':           'franjas',
  'franja':            'franjas',
  'embroidere':        'bordado',
  'bordadito':         'bordado',
  'bordado-a-mano':    'bordado',
  'handmade':          'bordado',
  'hand-made':         'bordado',
  'hecho-a-mano':      'bordado',
  'handcraft':         'bordado',
  'frase':             'mensaje',
  'eslogan':           'mensaje',
  'quote':             'mensaje',
  'letra':             'texto',
  'letras':            'texto',
  'writing':           'texto',
  'rock-band':         'banda',
  'band-shirt':        'banda',
  'banda-de-musica':   'banda',
  'musica':            'musical',
  'guitarra':          'musical',
  'fans':              'musical',
  'concert':           'musical',
  'concierto':         'musical',
  'marca':             'logotipo',
  'logos':             'logotipo',
  'logotip':           'logotipo',
  'logo':              'logotipo',
  'flores':            'floral',
  'flower':            'floral',
  'florido':           'floral',
  'plantas':           'floral',
  'geometric':         'geometrico',
  'geo':               'geometrico',
  'abstract':          'abstracto',
  'animales':          'animal-print',
  'leopardo':          'animal-print',
  'cebra':             'animal-print',
  'mili':              'camuflaje',
  'militar':           'camuflaje',
  'persa':             'paisley',

  // ── Material ──────────────────────────────────────────────────────────────
  'cotton':          'algodon',
  'cotton-puro':     'algodon-puro',
  '100-algodon':     'algodon-puro',
  'puro-algodon':    'algodon-puro',
  'algodon-organico':'organico',
  'eco':             'sostenible',
  'ecologico':       'sostenible',
  'reciclado':       'sostenible',
  'sustentable':     'sostenible',
  'eco-friendly':    'sostenible',
  'jeans':           'mezclilla',
  'vaquero':         'denim',
  'jean':            'denim',
  'spandex':         'stretch',
  'lycra':           'licra',
  'elastic':         'elastico',
  'elastizada':      'elastico',
  'stretchy':        'stretch',
  'suavecito':       'suave',
  'sedoso':          'suave',
  'seda':            'suave',
  'wicking':         'poliester',
  'plastico':        'sintetico',
  'velvet':          'terciopelo',
  'gamuzado':        'gamuza',
  'pano':            'franela',
  'jersei':          'jersey',

  // ── Neckline ──────────────────────────────────────────────────────────────
  'crew-neck':          'cuello-redondo',
  'crew':               'cuello-redondo',
  'redondo':            'cuello-redondo',
  'redondito':          'cuello-redondo',
  'cuello-redondito':   'cuello-redondo',
  'v':                  'cuello-v',
  'v-neck':             'cuello-v',
  'escote-v':           'cuello-v',
  'v-cut':              'cuello-v',
  'polo':               'cuello-polo',
  'rugby':              'cuello-polo',
  'tortuga':            'cuello-tortuga',
  'cuello-alto':        'cuello-tortuga',
  'half-zip':           'henley',
  'sin-cuellito':       'sin-cuello',
  'sq':                 'escote-cuadrado',
  'square':             'escote-cuadrado',
  'cuello-cuadrado':    'escote-cuadrado',
  'ovalado':            'escote-ovalado',

  // ── Sleeves ───────────────────────────────────────────────────────────────
  'mangacorta':       'manga-corta',
  'short-sleeve':     'manga-corta',
  'mangas':           'manga-corta',
  'mangacortita':     'manga-corta',
  'mangas-largas':    'manga-larga',
  'long-sleeve':      'manga-larga',
  '3/4':              'manga-3/4',
  'tres-cuartos':     'manga-3/4',
  'manga-tres-cuartos': 'manga-3/4',
  'sin-manga':        'sin-mangas',
  'sleeveless':       'sin-mangas',
  'strap':            'tirantes',
  'strapless':        'tirantes',
  'cintas':           'tirantes',

  // ── Length ────────────────────────────────────────────────────────────────
  'cropped':    'crop',
  'cortita':    'corto',
  'short':      'corto',
  'mini':       'corto',
  'ext':        'extendida',
  'extendido':  'largo',
  'asimetrica': 'asimetrico',
  'irregular':  'asimetrico',

  // ── Special ───────────────────────────────────────────────────────────────
  'edicion-especial': 'edicion-limitada',
  'limitada':         'edicion-limitada',
  'lujo':             'premium',
  'de-lujo':          'premium',
  'barato':           'economico',
  'economica':        'economico',
  'budget':           'economico',
  'promo':            'oferta',
  'descuento':        'oferta',
  'sale':             'oferta',
  'ofertas':          'oferta',
  'subidon':          'oferta',
  'rebaja':           'oferta',
  'insólito':         'raro',
  'insolito':         'raro',
  'coleccion':        'coleccionable',
  'de-coleccion':     'coleccionable',
  'importada':        'importado',
  'import':           'importado',
  'china':            'importado',
  'brasilena':        'local',
  'boliviana':        'local',
  'hecha-en-bolivia': 'local',
  'valenciaga':       'balenciaga',
  'balenciaga-paris': 'balenciaga',
  'offwhite':         'off-white',
  'ralph-lauren':     'polo-ralph-lauren',
  'tommy':            'tommy-hilfiger',
  'ck':               'calvin-klein',

  // ── Details ───────────────────────────────────────────────────────────────
  'boton':            'botones',
  'botoncitos':       'botones',
  'cierre-lateral':   'cierre',
  'zip':              'cremallera',
  'zipper':           'cremallera',
  'cordones':         'cordon',
  'cords':            'cordon',
  'drawstring':       'cordon',
  'hoodie':           'capucha',
  'hood':             'capucha',
  'pocket':           'bolsillo',
  'pockets':          'bolsillo',
  'costura':          'doble-costura',
  'etiqueta':         'etiqueta-exterior',
  'label':            'etiqueta-exterior',
  'tag':              'etiqueta-exterior',
  'perlage':          'perlas',
  'sequins':          'strass',
  'glow':             'glow-in-dark',
  'glow-in-the-dark': 'glow-in-dark',
}

// ─────────────────────────────────────────────────────────────────────────────
// SEMANTIC GROUPS — related canonical tags that co-match in search
// All values MUST be in CANONICAL_TAGS
// ─────────────────────────────────────────────────────────────────────────────

export const SEMANTIC_GROUPS = {
  fiesta:      ['fiesta', 'noche', 'elegante', 'social', 'carrete', 'antro', 'after-office', 'fecha', 'cena'],
  noche:       ['noche', 'fiesta', 'elegante', 'carrete', 'antro'],
  casual:      ['casual', 'diario', 'relax', 'hogar', 'todo-tempo'],
  hogar:       ['hogar', 'relax', 'casual', 'diario'],
  diario:      ['diario', 'casual', 'basica', 'relajado'],
  sport:       ['deportivo', 'sporty', 'gym', 'fitness', 'entrenamiento'],
  gym:         ['gym', 'fitness', 'deportivo', 'entrenamiento', 'stretch', 'elastico'],
  playa:       ['playa', 'verano', 'piscina', 'fresco'],
  formal:      ['formal', 'elegante', 'oficina', 'semi-formal', 'trabajo', 'cena'],
  trabajo:     ['trabajo', 'oficina', 'semi-formal'],
  oficina:     ['oficina', 'trabajo', 'semi-formal'],
  streetwear:  ['streetwear', 'urbano', 'alternativo', 'grunge', 'punk'],
  vintage:     ['vintage', 'retro', 'coleccionable', 'raro'],
  boho:        ['boho', 'bohemio', 'artistico', 'floral'],
  minimalista: ['minimalista', 'basica', 'liso'],
  hombre:      ['hombre', 'masculino'],
  mujer:       ['mujer', 'femenino'],
  verano:      ['verano', 'fresco', 'playa', 'piscina', 'manga-corta', 'sin-mangas', 'algodon', 'lino'],
  invierno:    ['invierno', 'abrigado', 'frio'],
  comodo:      ['relajado', 'casual', 'stretch', 'holgado', 'hogar'],
  stretch:     ['stretch', 'elastico', 'ajustado', 'gym', 'sporty'],
}

// ─────────────────────────────────────────────────────────────────────────────
// ANTONYMS — tags that cannot coexist with a search tag
// If the user searches for X, products tagged with X's antonyms are excluded.
// ─────────────────────────────────────────────────────────────────────────────

export const ANTONYMS = {
  // Pattern — liso means NO design whatsoever
  liso: [
    'estampado', 'grafico', 'bordado', 'tie-dye', 'floral', 'animal-print',
    'camuflaje', 'lettering', 'mensaje', 'texto', 'banda', 'musical',
    'logotipo', 'geometrico', 'abstracto', 'paisley', 'rayas', 'franjas',
  ],
  // Pattern — if searching for specific designs, exclude liso
  estampado:    ['liso'],
  grafico:      ['liso'],
  bordado:      ['liso'],
  'tie-dye':    ['liso'],
  floral:       ['liso'],
  'animal-print': ['liso'],

  // Fit
  oversize:   ['slim-fit', 'ajustado', 'entallado', 'justo'],
  'slim-fit': ['oversize', 'holgado', 'wide', 'boxy'],
  ajustado:   ['oversize', 'holgado', 'wide', 'boxy'],
  holgado:    ['slim-fit', 'ajustado', 'entallado'],

  // Sleeves
  'manga-larga': ['manga-corta', 'sin-mangas', 'tirantes'],
  'manga-corta': ['manga-larga'],
  'sin-mangas':  ['manga-larga'],
  tirantes:      ['manga-larga'],

  // Gender
  hombre: ['mujer', 'femenino'],
  mujer:  ['hombre', 'masculino'],

  // Season
  invierno: ['verano', 'fresco', 'caliente'],
  verano:   ['invierno', 'abrigado', 'frio'],
}

/**
 * Given a set of search tags, return tags that should be EXCLUDED from results.
 * Products containing any of these tags are filtered out.
 */
export function getExcludeTags(searchTags) {
  const excluded = new Set()
  for (const tag of searchTags) {
    for (const antonym of (ANTONYMS[tag] || [])) {
      excluded.add(antonym)
    }
  }
  // Never exclude a tag that's also being searched (avoid contradictions)
  for (const tag of searchTags) excluded.delete(tag)
  return [...excluded]
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a raw string for matching:
 * lowercase → strip diacritics → keep only a-z0-9 and hyphens → trim
 */
export function normalizeTag(tag) {
  if (!tag || typeof tag !== 'string') return ''
  return tag
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')      // remove special chars
    .replace(/\s+/g, '-')              // spaces → hyphens
    .replace(/-+/g, '-')               // collapse hyphens
    .replace(/^-|-$/g, '')             // trim leading/trailing hyphens
    .trim()
}

/**
 * Convert any tag string to its canonical form.
 * Resolution order:
 *   1. Direct canonical match (exact)
 *   2. Synonym map (exact)
 *   3. Fuzzy Levenshtein match against canonical tags (typo tolerance)
 *   4. Fuzzy Levenshtein match against synonym keys (typo tolerance)
 *   5. null — unknown tag, caller should drop it
 *
 * Fuzzy thresholds: min token length 4, max edit distance 1 for len≤5, 2 for len>5
 */
export function toCanonical(tag) {
  if (!tag) return null

  const normalized = normalizeTag(tag)
  if (!normalized) return null

  // 1. Direct canonical
  if (CANONICAL_TAGS.includes(normalized)) return normalized

  // 2. Synonym exact
  if (SYNONYMS[normalized]) return SYNONYMS[normalized]

  // 3 & 4. Fuzzy — only for tokens long enough to avoid false positives
  if (normalized.length >= 4) {
    const maxDist = normalized.length <= 5 ? 1 : 2
    let bestMatch = null
    let bestDist = maxDist + 1

    for (const canonical of CANONICAL_TAGS) {
      const d = levenshtein(normalized, canonical)
      if (d < bestDist) { bestDist = d; bestMatch = canonical }
    }

    for (const [variant, canonical] of Object.entries(SYNONYMS)) {
      const d = levenshtein(normalized, variant)
      if (d < bestDist) { bestDist = d; bestMatch = canonical }
    }

    if (bestMatch !== null) return bestMatch
  }

  return null  // unknown — drop cleanly, never leak garbage into ai_tags
}

/**
 * Convert an array of raw tags to canonical forms.
 * Removes nulls and duplicates.
 */
export function toCanonicalTags(tags) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map(toCanonical).filter(Boolean))]
}

/**
 * Expand a canonical tag array using semantic groups.
 * e.g. ['fiesta'] → ['fiesta', 'noche', 'elegante', 'social', ...]
 */
export function expandWithSemantic(tags) {
  if (!Array.isArray(tags)) return []
  const expanded = new Set(tags)
  for (const tag of tags) {
    for (const [groupName, groupTags] of Object.entries(SEMANTIC_GROUPS)) {
      if (groupTags.includes(tag) || tag === groupName) {
        groupTags.forEach(t => expanded.add(t))
      }
    }
  }
  return [...expanded]
}

/**
 * Parse a free-text search query into expanded canonical tags.
 * Steps: tokenize → normalize → toCanonical → expandWithSemantic
 * Pure JS — no API call needed.
 */
export function extractTagsFromQuery(query) {
  if (!query || typeof query !== 'string') return []

  const tokens = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2)

  return expandWithSemantic(toCanonicalTags(tokens))
}

/**
 * Score overlap between a product's tags and a set of search tags.
 * Returns 0–1: matches / searchTags.length
 */
export function calculateMatchScore(productTags, searchTags) {
  if (!productTags?.length || !searchTags?.length) return 0
  const productSet = new Set(productTags)
  let matches = 0
  for (const tag of searchTags) {
    if (productSet.has(tag)) matches++
  }
  return matches / searchTags.length
}

/**
 * Filter and rank products by tag relevance.
 */
export function filterByTags(products, searchTags, minScore = 0) {
  if (!searchTags?.length) return products
  return products
    .map(p => ({ product: p, score: calculateMatchScore(p.ai_tags || [], searchTags) }))
    .filter(x => x.score > minScore)
    .sort((a, b) => b.score - a.score)
    .map(x => x.product)
}

/**
 * Autocomplete: suggest canonical tags matching a partial query.
 */
export function suggestTags(query, limit = 10) {
  if (!query || query.length < 2) return []
  const normalized = normalizeTag(query)
  return CANONICAL_TAGS
    .filter(tag => tag.startsWith(normalized) || tag.includes(normalized))
    .slice(0, limit)
}

// ─────────────────────────────────────────────────────────────────────────────
export default {
  CANONICAL_TAGS, SYNONYMS, SEMANTIC_GROUPS, ANTONYMS,
  normalizeTag, toCanonical, toCanonicalTags,
  expandWithSemantic, extractTagsFromQuery, getExcludeTags,
  calculateMatchScore, filterByTags, suggestTags,
  TAGS_VERSION: '2.1.0',
}
