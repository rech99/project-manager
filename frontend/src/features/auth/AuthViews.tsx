import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { LogIn, UserPlus } from 'lucide-react';

export const AuthViews: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const { login, register, error, isLoading } = useAuthStore();
  const [successMsg, setSuccessMsg] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMsg('');

    if (!username || !password) {
      setValidationError('Username and password are required.');
      return;
    }

    if (isLogin) {
      const success = await login(username, password);
      if (success) {
        // Logged in!
      }
    } else {
      const success = await register({
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
      if (success) {
        setSuccessMsg('Account created successfully! Please log in.');
        setIsLogin(true);
        setPassword('');
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: 'linear-gradient(135deg, hsl(240, 16%, 6%) 0%, hsl(240, 15%, 15%) 100%)'
    }}>
      <div className="card" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '32px',
        border: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isLogin ? 'Sign in to access your projects' : 'Sign up to start collaborating'}
          </p>
        </div>

        {validationError && (
          <div style={{
            backgroundColor: 'var(--danger-glow)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {validationError}
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-glow)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            backgroundColor: 'var(--secondary-glow)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: 'var(--secondary)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label="Username"
            type="text"
            id="auth-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. sarah_dev"
            required
          />

          {!isLogin && (
            <>
              <Input
                label="Email Address"
                type="email"
                id="auth-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sarah@aerospace.io"
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <Input
                  label="First Name"
                  type="text"
                  id="auth-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Sarah"
                />
                <Input
                  label="Last Name"
                  type="text"
                  id="auth-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Connor"
                />
              </div>
            </>
          )}

          <Input
            label="Password"
            type="password"
            id="auth-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            icon={isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
            style={{ width: '100%', marginTop: '12px', padding: '12px' }}
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '14px',
          color: 'var(--text-secondary)'
        }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setValidationError('');
            }}
            className="btn-text"
            style={{ 
              fontWeight: '600', 
              color: 'var(--primary)', 
              padding: '0', 
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default AuthViews;
