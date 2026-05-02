import { Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { SignupPage } from './pages/SignupPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { UserDetailPage } from './pages/UserDetailPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route path="/user/:id" element={<UserDetailPage />} />
    </Routes>
  );
}
