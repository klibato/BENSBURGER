import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { CartProvider } from './context/CartContext';
import { CashRegisterProvider } from './context/CashRegisterContext';
import { StoreConfigProvider } from './context/StoreConfigContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/auth/PrivateRoute';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import LogsPage from './pages/LogsPage';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <StoreConfigProvider>
          <AuthProvider>
            <PermissionsProvider>
              <CashRegisterProvider>
                <CartProvider>
                  <Router>
                    <Routes>
                      {/* Route publique */}
                      <Route path="/login" element={<LoginPage />} />

                      {/* Routes protégées - Accessibles par tous les utilisateurs authentifiés */}
                      <Route
                        path="/"
                        element={
                          <PrivateRoute>
                            <POSPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/sales"
                        element={
                          <PrivateRoute>
                            <SalesHistoryPage />
                          </PrivateRoute>
                        }
                      />

                      {/* Routes protégées - Admin et Manager uniquement */}
                      <Route
                        path="/dashboard"
                        element={
                          <PrivateRoute requiredRole={['admin', 'manager']}>
                            <DashboardPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/products"
                        element={
                          <PrivateRoute requiredRole={['admin', 'manager']}>
                            <ProductsPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <PrivateRoute requiredRole={['admin', 'manager']}>
                            <SettingsPage />
                          </PrivateRoute>
                        }
                      />

                      {/* Routes protégées - Admin uniquement */}
                      <Route
                        path="/users"
                        element={
                          <PrivateRoute requiredRole="admin">
                            <UsersPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/logs"
                        element={
                          <PrivateRoute requiredRole="admin">
                            <LogsPage />
                          </PrivateRoute>
                        }
                      />
                    </Routes>
                  </Router>
                </CartProvider>
              </CashRegisterProvider>
            </PermissionsProvider>
          </AuthProvider>
        </StoreConfigProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
