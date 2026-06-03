import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase, addProduct, updateProduct, uploadPhoto, deleteProduct, getNextLabelForSize, freeLabel, getBundles } from '../lib/supabase.js'
import { SIZES, COLORS, COLOR_DOTS } from '../lib/constants.js'
import Header from '../components/Header.jsx'
import { Toast, useToast } from '../components/Toast.jsx'

const MAX_PHOTOS = 4
const LAST_BUNDLE_KEY = 'vestilo-last-bundle'
function getLastBundle() { try { return localStorage.getItem(LAST_BUNDLE_KEY) || '' } catch { return '' } }
function saveLastBundle(id) { try { if (id) localStorage.setItem(LAST_BUNDLE_KEY, id) } catch {} }
const EMPTY = () => ({ name: '', size: '', color: [], price: '35', notes: '', bundle_id: getLastBundle(), bundle_label: '' })

async function triggerPhotoCleanup(productId) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) return

  const request = (action) => fetch('/api/process-product-photos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ product_id: productId, action, force: action === 'process' }),
  })

  await request('process')

  for (let i = 0; i < 12; i++) {
    await new Promise(resolve => setTimeout(resolve, 30_000))
    const res = await request('poll')
    const data = await res.json().catch(() => null)
    if (!data?.pending) return
  }
}

export default function Upload() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const isEdit     = Boolean(id)
  const { toast, show } = useToast()

  const [form, setForm]       = useState(EMPTY())
  const [photos, setPhotos]   = useState([])
  const [activePhoto, setActivePhoto] = useState(0)
  const [saving, setSaving]           = useState(false)
  const [loading, setLoading]         = useState(isEdit)
  const [bundles, setBundles]         = useState([])
  const [detectingColors, setDetectingColors] = useState(false)

  // Load active bundles for the dropdown
  useEffect(() => {
    getBundles({ status: 'active' }).then(({ data }) => {
      if (data) setBundles(data)
    })
  }, [])

  // Load existing product for edit
  useEffect(() => {
    if (!isEdit) return
    supabase.from('products').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setForm({
          name:         data.name         || '',
          size:         data.size         || '',
          color:        Array.isArray(data.color) ? data.color : data.color ? [data.color] : [],
          price:        data.price        || '',
          notes:        data.notes        || '',
          bundle_id:    data.bundle_id    || '',
          bundle_label: data.bundle_label || '',
        })
        const existing = data.photos?.length
          ? data.photos.map(url => ({ file: null, preview: url, existing_url: url }))
          : data.photo_url
            ? [{ file: null, preview: data.photo_url, existing_url: data.photo_url }]
            : []
        setPhotos(existing)
      }
      setLoading(false)
    })
  }, [id, isEdit])

  async function detectColors(imageBase64) {
    setDetectingColors(true)
    try {
      const res = await fetch('/api/detect-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageBase64 }),
      })
      if (!res.ok) return
      const { colors } = await res.json()
      if (colors?.length) {
        setForm(f => f.color.length === 0 ? { ...f, color: colors } : f)
      }
    } catch {}
    finally { setDetectingColors(false) }
  }

  function handlePhotoAdd(e) {
    const files       = Array.from(e.target.files)
    const remaining   = MAX_PHOTOS - photos.length
    if (remaining <= 0) { show(`Máximo ${MAX_PHOTOS} fotos`, 'error'); return }
    const toAdd       = files.slice(0, remaining)
    const isFirstPhoto = photos.length === 0
    toAdd.forEach((file, idx) => {
      const reader = new FileReader()
      reader.onload = ev => {
        setPhotos(prev => [...prev, { file, preview: ev.target.result, existing_url: null }])
        if (idx === 0 && isFirstPhoto) detectColors(ev.target.result)
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removePhoto(idx) {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
    setActivePhoto(prev => Math.max(0, prev - (idx <= prev ? 1 : 0)))
  }

  function movePhoto(from, to) {
    setPhotos(prev => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
    setActivePhoto(to)
  }

  async function handleSizeChange(size) {
    setForm(f => ({ ...f, size }))
    if (!isEdit && size) {
      const label = await getNextLabelForSize(size)
      setForm(f => ({ ...f, size, name: label }))
    }
  }

  function handleBundleChange(bundleId) {
    saveLastBundle(bundleId)
    setForm(f => ({ ...f, bundle_id: bundleId, bundle_label: '' }))
  }

  function handlePriceBlur() {
    const raw = parseFloat(form.price)
    if (isNaN(raw) || raw <= 0) return
    const rounded = Math.ceil(raw) - 0.01
    setForm(f => ({ ...f, price: rounded }))
  }

  function toggleColor(c) {
    setForm(f => ({
      ...f,
      color: f.color.includes(c) ? f.color.filter(x => x !== c) : [...f.color, c]
    }))
  }

  async function handleSave() {
    if (!form.name || !form.size || !form.color.length || !form.price) {
      show('Completa todos los campos requeridos', 'error')
      return
    }
    setSaving(true)
    try {
      const productId = isEdit ? id : null

      const uploadedUrls = await Promise.all(
        photos.map(async p => {
          if (p.existing_url) return p.existing_url
          return await uploadPhoto(p.file, productId || `temp-${Date.now()}-${Math.random()}`)
        })
      )
      const hasNewPhotos = photos.some(p => !p.existing_url)
      const hasNewFirstPhoto = !!uploadedUrls[0] && !!photos[0]?.file

      const photo_url = uploadedUrls[0] || null
      const photoData = {
        photo_url,
        photos: uploadedUrls,
        ...(hasNewPhotos ? { original_photos: uploadedUrls } : {}),
        ...(hasNewFirstPhoto ? {
          photo_processing_status: 'pending',
          photo_processed_at: null,
          photo_processing_error: null,
          photo_processing_model: null,
          photo_processing_batch_id: null,
          photo_processing_input_file_id: null,
          photo_processing_output_file_id: null,
        } : {}),
      }

      const bundleData = {
        bundle_id:    form.bundle_id    || null,
        bundle_label: form.bundle_label || null,
      }

      if (isEdit) {
        await updateProduct(id, { ...form, price: parseFloat(form.price), ...photoData, ...bundleData })
        show('Producto actualizado')
        if (uploadedUrls[0]) {
          fetch('/api/analyze-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: id, photo_urls: uploadedUrls.filter(Boolean) })
          }).catch(() => {})
        }
        if (hasNewFirstPhoto) triggerPhotoCleanup(id).catch(() => {})
      } else {
        const { data: newProduct, error } = await addProduct({
          ...form, price: parseFloat(form.price), status: 'Disponible',
          photo_url: null, photos: [], ...bundleData,
        })
        if (error) throw error
        const finalUrls = await Promise.all(
          photos.map(p => uploadPhoto(p.file, newProduct.id))
        )
        await updateProduct(newProduct.id, {
          photo_url: finalUrls[0] || null,
          photos: finalUrls,
          original_photos: finalUrls,
          photo_processing_status: finalUrls[0] ? 'pending' : null,
          photo_processed_at: null,
          photo_processing_error: null,
          photo_processing_model: null,
          photo_processing_batch_id: null,
          photo_processing_input_file_id: null,
          photo_processing_output_file_id: null,
        })
        show('Producto guardado')
        if (finalUrls[0]) {
          fetch('/api/analyze-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: newProduct.id, photo_urls: finalUrls.filter(Boolean) })
          }).catch(() => {})
        }
        if (finalUrls[0]) triggerPhotoCleanup(newProduct.id).catch(() => {})
      }
      setTimeout(() => navigate('/admin'), 800)
    } catch (err) {
      console.error(err)
      show('Error al guardar. Intenta de nuevo.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar este producto? Esta acción no se puede deshacer.`)) return
    // Free the label so it can be reused
    if (form.size && form.name) {
      await freeLabel(form.size, form.name)
    }
    await deleteProduct(id)
    show('Eliminado')
    setTimeout(() => navigate('/admin'), 600)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Header admin />
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
    </div>
  )

  const mainPhoto = photos[activePhoto]?.preview || null
  const selectedBundle = bundles.find(b => b.id === form.bundle_id)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <Header admin />
      <Toast toast={toast} />

      <div className="va-upload">
        <div className="va-up-head">
          <Link to="/admin" className="v-back">← Volver</Link>
          <h2 className="va-up-title">{isEdit ? 'Editar prenda' : 'Nueva prenda'}</h2>
          {isEdit
            ? <button onClick={handleDelete} style={{ fontSize: 12, color: '#B23A2E', background: 'transparent', border: 'none', cursor: 'pointer' }}>Eliminar</button>
            : <span style={{ width: 48 }} />}
        </div>

        {/* Photo section */}
        <div className="va-up-card">
          {mainPhoto ? (
            <div className="va-up-photo"><img src={mainPhoto} alt="preview" /></div>
          ) : (
            <div className="va-up-empty">
              <div className="va-up-empty-t">Agregá fotos de la prenda</div>
              <div className="va-up-empty-s">Hasta {MAX_PHOTOS} fotos · JPG, PNG</div>
            </div>
          )}

          <div className="va-up-thumbs">
            {photos.map((p, i) => (
              <div key={i} className="va-up-thumb-wrap">
                <img src={p.preview} onClick={() => setActivePhoto(i)}
                  className={'va-up-thumb' + (i === activePhoto ? ' on' : '')} />
                <button onClick={() => removePhoto(i)} className="va-up-thumb-x">✕</button>
                {i > 0 && <button onClick={() => movePhoto(i, i - 1)} className="va-up-thumb-mv">←</button>}
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <>
                {/* Camera — opens rear camera directly on iOS and Android */}
                <label className="va-up-add">
                  <span style={{ fontSize: 16, color: 'var(--muted)' }}>📷</span>
                  <span className="va-up-add-c">Cámara</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoAdd} style={{ display: 'none' }} />
                </label>
                {/* Gallery — file picker */}
                <label className="va-up-add">
                  <span style={{ fontSize: 16, color: 'var(--muted)' }}>＋</span>
                  <span className="va-up-add-c">{photos.length}/{MAX_PHOTOS}</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} style={{ display: 'none' }} />
                </label>
              </>
            )}
          </div>

          {photos.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              La primera foto aparece en el catálogo. Usá ← para reordenar.
            </div>
          )}
        </div>

        {/* Basic info */}
        <div className="va-up-card">
          <div className="va-up-grid2">
            <div className="va-field">
              <label>Talla *</label>
              <select value={form.size} onChange={e => handleSizeChange(e.target.value)}>
                <option value="">Seleccionar...</option>
                {SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="va-field">
              <label>Precio (Bs.) *</label>
              <input type="number" placeholder="120" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                onBlur={handlePriceBlur} />
            </div>
          </div>

          <div className="va-field">
            <label>
              Nombre / etiqueta *
              {!isEdit && form.size && <span className="va-auto"> · auto-generado</span>}
            </label>
            <input placeholder="Ej: M-001" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="va-field">
            <label>Notas internas</label>
            <textarea placeholder="Notas sobre la prenda (solo visible para el equipo)..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* Bundle assignment */}
        <div className="va-up-card">
          <div className="va-field">
            <label>Lote de inventario</label>
            {bundles.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 0' }}>
                No hay lotes activos. <Link to="/admin" style={{ color: 'var(--ink)' }}>Creá uno en la pestaña Lotes →</Link>
              </div>
            ) : (
              <select value={form.bundle_id} onChange={e => handleBundleChange(e.target.value)}>
                <option value="">Sin asignar a lote</option>
                {bundles.map(b => (
                  <option key={b.id} value={b.id}>{b.name} — Bs. {b.cost_per_unit}/u</option>
                ))}
              </select>
            )}
          </div>
          {form.bundle_id && selectedBundle && (
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Costo del lote: <strong style={{ color: 'var(--ink)' }}>Bs. {selectedBundle.cost_per_unit}</strong> por prenda · {selectedBundle.units_remaining ?? '—'} disponibles
            </div>
          )}
        </div>

        {/* Color */}
        <div className="va-up-card">
          <div className="va-field-label">
            Color *{detectingColors
              ? <span className="va-auto"> · detectando...</span>
              : form.color.length > 0 && <span className="va-auto"> · {form.color.join(', ')}</span>}
          </div>
          <div className="va-color-grid">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => toggleColor(c)}
                className={'va-color' + (form.color.includes(c) ? ' on' : '')}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR_DOTS[c] || '#ccc', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button className="va-btn-dark" onClick={handleSave} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {saving
            ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: 'var(--paper)' }} />
            : isEdit ? 'Guardar cambios' : 'Guardar prenda →'
          }
        </button>
      </div>
    </div>
  )
}
