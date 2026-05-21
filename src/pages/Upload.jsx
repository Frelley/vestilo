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

      const photo_url = uploadedUrls[0] || null
      const photoData = {
        photo_url,
        photos: uploadedUrls,
        ...(hasNewPhotos ? {
          original_photos: uploadedUrls,
          photo_processing_status: 'pending',
          photo_processed_at: null,
          photo_processing_error: null,
          photo_processing_model: null,
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
        })
        show('Producto guardado')
        if (finalUrls[0]) {
          fetch('/api/analyze-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: newProduct.id, photo_urls: finalUrls.filter(Boolean) })
          }).catch(() => {})
        }
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
    <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
      <Header admin />
      <Toast toast={toast} />

      <div style={{ maxWidth: 560, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Link to="/admin" style={{ fontSize: 13, color: '#9e8a6a', textDecoration: 'none' }}>← Volver</Link>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18 }}>
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          {isEdit && (
            <button onClick={handleDelete} style={{ fontSize: 12, color: '#c62828', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              Eliminar
            </button>
          )}
        </div>

        {/* Photo section */}
        <div className="card" style={{ marginBottom: 12 }}>
          {mainPhoto ? (
            <img src={mainPhoto} alt="preview"
              style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ height: 180, background: '#f0ede8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: 36 }}>📸</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: '#9e8a6a' }}>Agrega fotos del producto</div>
              <div style={{ fontSize: 12, color: '#c4b9a8' }}>Hasta {MAX_PHOTOS} fotos · JPG, PNG</div>
            </div>
          )}

          <div style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {photos.map((p, i) => (
              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={p.preview}
                  onClick={() => setActivePhoto(i)}
                  style={{
                    width: 56, height: 56, objectFit: 'cover', borderRadius: 6, cursor: 'pointer',
                    border: i === activePhoto ? '2px solid #1a1209' : '2px solid transparent',
                    opacity: i === activePhoto ? 1 : 0.7
                  }}
                />
                <button onClick={() => removePhoto(i)} style={{
                  position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                  borderRadius: '50%', background: '#c62828', color: '#fff', border: 'none',
                  fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
                {i > 0 && (
                  <button onClick={() => movePhoto(i, i - 1)} style={{
                    position: 'absolute', bottom: -6, left: -6, width: 18, height: 18,
                    borderRadius: '50%', background: '#1a1209', color: '#f5e6c8', border: 'none',
                    fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>←</button>
                )}
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {/* Camera — opens rear camera directly on both iOS and Android */}
                <label style={{
                  width: 56, height: 56, borderRadius: 6, border: '1.5px dashed #c4b9a8',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', background: '#faf8f5', gap: 2
                }}>
                  <span style={{ fontSize: 16, color: '#9e8a6a' }}>📷</span>
                  <span style={{ fontSize: 8, color: '#c4b9a8' }}>Cámara</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoAdd} style={{ display: 'none' }} />
                </label>
                {/* Gallery — opens file picker / gallery */}
                <label style={{
                  width: 56, height: 56, borderRadius: 6, border: '1.5px dashed #c4b9a8',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', background: '#faf8f5', gap: 2
                }}>
                  <span style={{ fontSize: 16, color: '#9e8a6a' }}>🖼️</span>
                  <span style={{ fontSize: 8, color: '#c4b9a8' }}>{photos.length}/{MAX_PHOTOS}</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} style={{ display: 'none' }} />
                </label>
              </div>
            )}
          </div>

          {photos.length > 0 && (
            <div style={{ padding: '0 12px 10px', fontSize: 11, color: '#9e8a6a' }}>
              La primera foto aparece en el catálogo. Usa ← para reordenar.
            </div>
          )}
        </div>

        {/* Basic info */}
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lblStyle}>Talla *</label>
                <select value={form.size} onChange={e => handleSizeChange(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={lblStyle}>Precio (Bs.) *</label>
                <input type="number" placeholder="120" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  onBlur={handlePriceBlur} />
              </div>
            </div>

            <div>
              <label style={lblStyle}>
                Nombre / etiqueta *
                {!isEdit && form.size && <span style={{ marginLeft: 6, color: '#c4b9a8', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>auto-generado</span>}
              </label>
              <input placeholder="Ej: M-001" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div>
              <label style={lblStyle}>Notas internas</label>
              <textarea placeholder="Notas sobre el producto (solo visible para el equipo)..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* Bundle assignment */}
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <label style={lblStyle}>Lote de inventario</label>
          {bundles.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9e8a6a', padding: '8px 0' }}>
              No hay lotes activos. <Link to="/admin" style={{ color: '#1a1209' }}>Crea uno en la pestaña Lotes →</Link>
            </div>
          ) : (
            <select value={form.bundle_id} onChange={e => handleBundleChange(e.target.value)}>
              <option value="">Sin asignar a lote</option>
              {bundles.map(b => (
                <option key={b.id} value={b.id}>{b.name} — Bs. {b.cost_per_unit}/u</option>
              ))}
            </select>
          )}

          {form.bundle_id && selectedBundle && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#9e8a6a' }}>
              Costo del lote: <strong style={{ color: '#1a1209' }}>Bs. {selectedBundle.cost_per_unit}</strong> por prenda · {selectedBundle.units_remaining ?? '—'} disponibles
            </div>
          )}
        </div>

        {/* Color */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <label style={lblStyle}>
            Color *{detectingColors
              ? <span style={{ textTransform: 'none', letterSpacing: 0, color: '#c4b9a8', fontStyle: 'italic' }}> — detectando...</span>
              : form.color.length > 0 && <span style={{ textTransform: 'none', letterSpacing: 0, color: '#c4b9a8', fontStyle: 'italic' }}> — {form.color.join(', ')}</span>
            }
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => toggleColor(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 99,
                  border: form.color.includes(c) ? '2px solid #1a1209' : '1px solid #e8e0d4',
                  background: form.color.includes(c) ? '#1a1209' : 'transparent',
                  color: form.color.includes(c) ? '#f5e6c8' : '#9e8a6a', fontSize: 12, cursor: 'pointer'
                }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR_DOTS[c] || '#ccc', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}
          style={{ width: '100%', padding: 14, fontSize: 15 }}>
          {saving
            ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: '#f5e6c8' }} />
            : isEdit ? 'Guardar cambios' : 'Guardar producto →'
          }
        </button>
      </div>
    </div>
  )
}

const lblStyle = {
  fontSize: 11, color: '#9e8a6a', display: 'block',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1
}
