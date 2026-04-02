import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../lib/supabase.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await signIn(email, password)
    if (err) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate('/admin')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Vestilo a tu sonso!
          </h1>
          <p style={{ color: '#9e8a6a', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
            Panel de administración
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#9e8a6a', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>
                Email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#9e8a6a', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>
                Contraseña
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>

            {error && (
              <div style={{ background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}