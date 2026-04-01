import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './lib/supabase.js'
import Catalogue from './pages/Catalogue.jsx'
import Product from './pages/Product.jsx'
import Login from './pages/Login.jsx'
import Admin from './pages/Admin.jsx'
import Upload from './pages/Upload.jsx'

// ─── Auth context ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" /></div>
  return session ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthCtx.Provider value={{ session, loading }}>
      <Routes>
        {/* Public */}
        <Route path="/"           element={<Catalogue />} />
        <Route path="/p/:id"      element={<Product />} />

        {/* Admin */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin"       element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/admin/upload"  element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/admin/upload/:id" element={<ProtectedRoute><Upload /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthCtx.Provider>
  )
}
