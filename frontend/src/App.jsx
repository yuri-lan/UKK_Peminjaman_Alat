import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import KelolaUser from './pages/KelolaUser';
import KelolaAlat from './pages/KelolaAlat';
import KelolaKategori from './pages/KelolaKategori';
import LogAktivitas from './pages/LogAktivitas';
import PeminjamanMasuk from './pages/PeminjamanMasuk';
import PengembalianPage from './pages/PengembalianPage';
import RiwayatSaya from './pages/RiwayatSaya';
import KelolaDenda from './pages/KelolaDenda';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          <Route path="/dashboard" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />

            {/* Admin only */}
            <Route path="user"     element={<RoleRoute roles={['admin']}><KelolaUser /></RoleRoute>} />
            <Route path="alat"     element={<RoleRoute roles={['admin']}><KelolaAlat /></RoleRoute>} />
            <Route path="kategori" element={<RoleRoute roles={['admin']}><KelolaKategori /></RoleRoute>} />
            <Route path="log"      element={<RoleRoute roles={['admin']}><LogAktivitas /></RoleRoute>} />

            {/* Petugas + Admin */}
            <Route path="peminjaman"   element={<RoleRoute roles={['petugas','admin']}><PeminjamanMasuk /></RoleRoute>} />
            <Route path="pengembalian" element={<RoleRoute roles={['petugas','admin']}><PengembalianPage /></RoleRoute>} />
            <Route path="denda" element={<RoleRoute roles={['petugas','admin']}><KelolaDenda /></RoleRoute>} />

            {/* Peminjam only */}
            <Route path="riwayat" element={<RoleRoute roles={['peminjam']}><RiwayatSaya /></RoleRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}