import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { signOut } from '../lib/supabase.js'

export default function Header({ admin = false }) {
  const { session } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <header style={{
      background: '#1a1209',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>
          Vestilo a tu sonso
        </div>
        <div style={{ color: '#9e8a6a', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginTop: -2 }}>
          Santa Cruz · Bolivia
        </div>
      </Link>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {session ? (
          <>
            {!admin && (
              <Link to="/admin" style={{ color: '#9e8a6a', fontSize: 12, textDecoration: 'none' }}>
                Admin
              </Link>
            )}
            {admin && (
              <Link to="/admin/upload" style={{
                background: '#f5e6c8', color: '#1a1209', padding: '6px 12px',
                borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none'
              }}>
                + Agregar
              </Link>
            )}
            <button onClick={handleSignOut} style={{
              background: 'transparent', border: '1px solid #3d3020', color: '#9e8a6a',
              padding: '5px 10px', borderRadius: 6, fontSize: 12
            }}>
              Salir
            </button>
          </>
        ) : (
          <Link to="/admin/login" style={{ color: '#9e8a6a', fontSize: 12, textDecoration: 'none' }}>
            Admin
          </Link>
        )}
      </div>
    </header>
  )
}
