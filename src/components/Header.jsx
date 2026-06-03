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
    <header className="v-top">
      <div className="v-top-in">
        <Link to="/" className="v-wm">
          <div className="v-wm-name">Vestilo <em>a tu sonso</em></div>
          <div className="v-wm-sub">Santa Cruz · Bolivia</div>
        </Link>

        <div className="v-top-actions">
          {session ? (
            <>
              {!admin && (
                <Link to="/admin" className="v-admin-link">Admin</Link>
              )}
              {admin && (
                <Link to="/admin/upload" className="v-search-btn" style={{ padding: '9px 15px', borderRadius: 2 }}>
                  + Agregar
                </Link>
              )}
              <button onClick={handleSignOut} className="v-btn-ghost">Salir</button>
            </>
          ) : (
            <Link to="/admin/login" className="v-admin-link">Admin</Link>
          )}
        </div>
      </div>
    </header>
  )
}
