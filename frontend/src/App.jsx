import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { CartProvider } from './context/CartContext';
import { CashRegisterProvider } from './context/CashRegisterContext';
import { StoreConfigProvider } from './context/StoreConfigContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
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
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/" element={<POSPage />} />
                      <Route path="/sales" element={<SalesHistoryPage />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/users" element={<UsersPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/logs" element={<LogsPage />} />
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
