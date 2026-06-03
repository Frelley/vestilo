import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
    <div className="va-login">
      <div className="va-login-box">
        <div className="va-login-head">
          <div className="va-login-wm">Vestilo <em>a tu sonso</em></div>
          <div className="va-login-sub">Panel de administración</div>
        </div>

        <form className="va-login-card" onSubmit={handleSubmit}>
          <div className="va-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="hola@vestilo.bo" />
          </div>

          <div className="va-field">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
          </div>

          {error && (
            <div style={{ background: 'rgba(178,58,46,.08)', color: '#B23A2E', padding: '8px 12px', borderRadius: 2, fontSize: 13, border: '1px solid rgba(178,58,46,.25)' }}>
              {error}
            </div>
          )}

          <button type="submit" className="va-btn-dark" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <Link to="/" className="va-login-back">← Volver a la tienda</Link>
      </div>
    </div>
  )
}
