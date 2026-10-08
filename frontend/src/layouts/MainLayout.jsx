import { useAuth } from '../context/AuthContext';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  const handleLogout = () => {
    // Simpan flash message di localStorage biar bisa dibaca halaman login
    localStorage.setItem('flash_message', JSON.stringify({
      type: 'info',
      text: 'Anda berhasil logout. Sampai jumpa! 👋'
    }));
    logout();
    navigate('/');
  };

  const roleColor = {
    admin:    'from-indigo-500 to-purple-600',
    petugas:  'from-emerald-500 to-teal-600',
    peminjam: 'from-amber-500 to-orange-600',
  }[user?.role] || 'from-slate-500 to-slate-600';

  return (
    <>
      {ToastComponent}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Top Navbar */}
        <nav className={`bg-gradient-to-r ${roleColor} text-white shadow-lg`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-tight">Peminjaman Alat</h1>
                  <p className="text-xs opacity-80">Sistem Informasi</p>
                </div>
              </Link>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-3 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl">
                  <div className="w-8 h-8 bg-white/25 rounded-full flex items-center justify-center font-bold">
                    {user?.nama_lengkap?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold leading-tight">{user?.nama_lengkap}</p>
                    <p className="text-xs opacity-80 capitalize">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-medium transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </>
  );
}