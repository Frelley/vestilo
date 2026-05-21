import { rateLimit } from './_rateLimit.js'

export const maxDuration = 300

const BUCKET = 'product-photos'
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'
const IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE || '1024x1536'
const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium'
const OUTPUT_FORMAT = process.env.OPENAI_IMAGE_OUTPUT_FORMAT || 'jpeg'
const OUTPUT_COMPRESSION = Number(process.env.OPENAI_IMAGE_OUTPUT_COMPRESSION || 86)

const EDIT_PROMPT = `Edit this product photo for mobile ecommerce.
Preserve the actual clothing item and mannequin as faithfully as possible: same color, print, logo/text, fabric texture, wrinkles on the garment, seams, stitching, shape, neckline, sleeves, and proportions.
Make the shirt look neatly presented and lightly ironed or steamed: reduce strong wrinkles, harsh creases, and crushed fabric areas while keeping natural fabric texture and realistic drape.
Clean the background into a smooth neutral off-white studio backdrop.
Clean the product silhouette edges where the product meets the background: remove rough halos, background bleed, jagged edges, and distracting cast shadows.
Keep a subtle natural grounding shadow.
Do not redraw, smooth, upscale, stylize, repaint, or reinterpret the product.
Do not add a person, hanger, props, text, watermark, labels, or change the product.`

function json(res, status, body) {
  return res.status(status).json(body)
}

function productPhotos(product) {
  if (Array.isArray(product?.photos) && product.photos.length) return product.photos.filter(Boolean)
  return product?.photo_url ? [product.photo_url] : []
}

async function requireSignedInUser(req, { supabaseUrl, anonKey }) {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    const err = new Error('Missing admin session')
    err.status = 401
    throw err
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: authHeader,
    },
  })

  if (!userRes.ok) {
    const err = new Error('Invalid admin session')
    err.status = 401
    throw err
  }
}

async function supabaseFetch(path, { supabaseUrl, serviceRoleKey, ...options }) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(options.headers || {}),
    },
  })
  return res
}

async function patchProduct(productId, updates, env) {
  const res = await supabaseFetch(`/rest/v1/products?id=eq.${productId}`, {
    ...env,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(updates),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || data?.error || 'Supabase product update failed')
  return Array.isArray(data) ? data[0] : data
}

async function fetchProduct(productId, env) {
  const res = await supabaseFetch(`/rest/v1/products?id=eq.${productId}&select=*`, env)
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || data?.error || 'Supabase product fetch failed')
  return Array.isArray(data) ? data[0] : null
}

async function editPhoto(imageUrl) {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    const err = new Error('Missing OPENAI_API_KEY')
    err.status = 500
    throw err
  }

  const openaiRes = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      images: [{ image_url: imageUrl }],
      prompt: EDIT_PROMPT,
      size: IMAGE_SIZE,
      quality: IMAGE_QUALITY,
      output_format: OUTPUT_FORMAT,
      output_compression: OUTPUT_COMPRESSION,
      n: 1,
    }),
  })

  const data = await openaiRes.json().catch(() => null)
  if (!openaiRes.ok) {
    const err = new Error(data?.error?.message || 'OpenAI image edit failed')
    err.status = openaiRes.status
    throw err
  }

  const b64 = data?.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI image edit returned no image')
  return Buffer.from(b64, 'base64')
}

async function uploadProcessedPhoto(productId, index, bytes, env) {
  const ext = OUTPUT_FORMAT === 'webp' ? 'webp' : OUTPUT_FORMAT === 'png' ? 'png' : 'jpg'
  const contentType = OUTPUT_FORMAT === 'webp' ? 'image/webp' : OUTPUT_FORMAT === 'png' ? 'image/png' : 'image/jpeg'
  const path = `processed/${productId}-${Date.now()}-${index + 1}.${ext}`
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${path}`, {
    ...env,
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: bytes,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || data?.error || 'Supabase storage upload failed')
  return `${env.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(ip, { limit: 12, windowMs: 60 * 60_000 })
  if (!rl.ok) return json(res, 429, { error: 'Too many photo processing requests', retryAfter: rl.retryAfter })

  const env = {
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!env.supabaseUrl || !env.serviceRoleKey || !anonKey) {
    return json(res, 500, { error: 'Missing environment variables' })
  }

  try {
    await requireSignedInUser(req, { supabaseUrl: env.supabaseUrl, anonKey })

    const { product_id, action = 'process', force = false } = req.body || {}
    if (!product_id) return json(res, 400, { error: 'Missing product_id' })

    const product = await fetchProduct(product_id, env)
    if (!product) return json(res, 404, { error: 'Product not found' })

    const originals = Array.isArray(product.original_photos) && product.original_photos.length
      ? product.original_photos.filter(Boolean)
      : productPhotos(product)

    if (action === 'restore') {
      if (!originals.length) return json(res, 400, { error: 'No original photos saved' })
      const restored = await patchProduct(product_id, {
        photo_url: originals[0] || null,
        photos: originals,
        photo_processing_status: 'pending',
        photo_processing_error: null,
      }, env)
      return json(res, 200, { ok: true, product: restored })
    }

    if (!force && product.photo_processing_status === 'done') {
      return json(res, 200, { ok: true, skipped: true, product })
    }
    if (!originals.length) return json(res, 400, { error: 'Product has no photos' })

    await patchProduct(product_id, {
      original_photos: originals,
      photo_processing_status: 'processing',
      photo_processing_error: null,
    }, env)

    const processedUrls = []
    for (let i = 0; i < originals.length; i++) {
      const bytes = await editPhoto(originals[i])
      const publicUrl = await uploadProcessedPhoto(product_id, i, bytes, env)
      processedUrls.push(publicUrl)
    }

    const updated = await patchProduct(product_id, {
      original_photos: originals,
      photo_url: processedUrls[0] || null,
      photos: processedUrls,
      photo_processing_status: 'done',
      photo_processed_at: new Date().toISOString(),
      photo_processing_error: null,
      photo_processing_model: IMAGE_MODEL,
    }, env)

    return json(res, 200, { ok: true, product: updated })
  } catch (err) {
    const productId = req.body?.product_id
    if (productId && env.supabaseUrl && env.serviceRoleKey) {
      try {
        await patchProduct(productId, {
          photo_processing_status: 'failed',
          photo_processing_error: err.message,
        }, env)
      } catch {}
    }
    return json(res, err.status || 500, { error: err.message })
  }
}
