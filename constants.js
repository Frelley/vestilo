import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase, addProduct, updateProduct, uploadPhoto, deleteProduct, getNextLabelForSize } from '../lib/supabase.js'
import { SIZES, COLORS, CATS, STYLES, COLOR_DOTS } from '../lib/constants.js'
import Header from '../components/Header.jsx'
import { Toast, useToast } from '../components/Toast.jsx'

const EMPTY = { name: '', cat: '', size: '', color: '', price: '', styles: [], notes: '' }
const MAX_PHOTOS = 4

export default function Upload() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const { toast, show } = useToast()

  const [form, setForm] = useState(EMPTY)
  const [photos, setPhotos] = useState([]) // { file, preview, existing_url }
  const [activePhoto, setActivePhoto] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    supabase.from('products').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setForm({
          name:   data.name   || '',
          cat:    data.cat    || '',
          size:   data.size   || '',
          color:  data.color  || '',
          price:  data.price  || '',
          styles: data.styles || [],
          notes:  data.notes  || '',
        })
        // Load existing photos — support both old single photo_url and new photos array
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

  function handlePhotoAdd(e) {
    const files = Array.from(e.target.files)
    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) { show(`Máximo ${MAX_PHOTOS} fotos`, 'error'); return }
    const toAdd = files.slice(0, remaining)
    toAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        setPhotos(prev => [...prev, { file, preview: ev.target.result, existing_url: null }])
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

  function handlePriceBlur() {
    const raw = parseFloat(form.price)
    if (isNaN(raw) || raw <= 0) return
    const rounded = Math.ceil(raw) - 0.01
    setForm(f => ({ ...f, price: rounded }))
  }

  function toggleStyle(s) {
    setForm(f => ({
      ...f,
      styles: f.styles.includes(s) ? f.styles.filter(x => x !== s) : [...f.styles, s]
    }))
  }

  async function handleSave() {
    if (!form.name || !form.size || !form.color || !form.price || !form.cat) {
      show('Completa todos los campos requeridos', 'error')
      return
    }
    setSaving(true)
    try {
      const productId = isEdit ? id : null

      // Upload new photos, keep existing URLs
      const uploadedUrls = await Promise.all(
        photos.map(async p => {
          if (p.existing_url) return p.existing_url
          return await uploadPhoto(p.file, productId || `temp-${Date.now()}-${Math.random()}`)
        })
      )

      const photo_url = uploadedUrls[0] || null
      const photoData = { photo_url, photos: uploadedUrls }

      if (isEdit) {
        await updateProduct(id, { ...form, price: parseFloat(form.price), ...photoData })
        show('Producto actualizado')
      } else {
        const { data: newProduct, error } = await addProduct({
          ...form, price: parseFloat(form.price), status: 'Disponible', photo_url: null, photos: [],
        })
        if (error) throw error
        // Re-upload with real ID
        const finalUrls = await Promise.all(
          photos.map(p => uploadPhoto(p.file, newProduct.id))
        )
        await updateProduct(newProduct.id, { photo_url: finalUrls[0] || null, photos: finalUrls })
        show('Producto guardado')
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
          {/* Main photo display */}
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

          {/* Thumbnail row */}
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
                {/* Remove button */}
                <button onClick={() => removePhoto(i)} style={{
                  position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                  borderRadius: '50%', background: '#c62828', color: '#fff', border: 'none',
                  fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1
                }}>✕</button>
                {/* Move left */}
                {i > 0 && (
                  <button onClick={() => movePhoto(i, i - 1)} style={{
                    position: 'absolute', bottom: -6, left: -6, width: 18, height: 18,
                    borderRadius: '50%', background: '#1a1209', color: '#f5e6c8', border: 'none',
                    fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>←</button>
                )}
              </div>
            ))}

            {/* Add photo button */}
            {photos.length < MAX_PHOTOS && (
              <label style={{
                width: 56, height: 56, borderRadius: 6, border: '1.5px dashed #c4b9a8',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: '#faf8f5', flexShrink: 0, gap: 2
              }}>
                <span style={{ fontSize: 18, color: '#9e8a6a' }}>+</span>
                <span style={{ fontSize: 9, color: '#c4b9a8' }}>{photos.length}/{MAX_PHOTOS}</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} style={{ display: 'none' }} />
              </label>
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
            <div>
              <label style={lblStyle}>
                Nombre / descripción *
                {!isEdit && form.size && <span style={{ marginLeft: 6, color: '#c4b9a8', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>auto-generado al elegir talla</span>}
              </label>
              <input placeholder="Ej: M-001" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lblStyle}>Precio (Bs.) *</label>
                <input type="number" placeholder="120" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} onBlur={handlePriceBlur} />
              </div>
              <div>
                <label style={lblStyle}>Talla *</label>
                <select value={form.size} onChange={e => handleSizeChange(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={lblStyle}>Categoría *</label>
              <select value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lblStyle}>Notas internas</label>
              <textarea placeholder="Notas sobre el producto (solo visible para el equipo)..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* Color */}
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <label style={lblStyle}>Color *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 99,
                  border: form.color === c ? '2px solid #1a1209' : '1px solid #e8e0d4',
                  background: form.color === c ? '#1a1209' : 'transparent',
                  color: form.color === c ? '#f5e6c8' : '#9e8a6a', fontSize: 12, cursor: 'pointer' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR_DOTS[c] || '#ccc', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Styles */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <label style={lblStyle}>Estilo (selecciona todos los que apliquen)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STYLES.map(s => (
              <button key={s} type="button" onClick={() => toggleStyle(s)}
                style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                  border: form.styles.includes(s) ? '2px solid #1a1209' : '1px solid #e8e0d4',
                  background: form.styles.includes(s) ? '#1a1209' : 'transparent',
                  color: form.styles.includes(s) ? '#f5e6c8' : '#9e8a6a' }}>
                {s}
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
