import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../services/supabase';
import { Shield, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './AuthPage.module.scss';
import './AuthPage.css';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { setSession, setProfile } = useAppStore();

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all credentials');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Authenticate password
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        setSession(data.session);
        setProfile({
          id: data.user.id,
          email: data.user.email,
          role: data.user.email.includes('admin') ? 'admin' : 'viewer',
        });
        toast.success(`Logged in as: ${data.user.email}`);
        navigate('/dashboard');
      } else {
        // Sign up credentials
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Registration successful. You can log in now!');
        setIsLogin(true);
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBypassDemo = () => {
    // Inject mock admin session directly to run console instantly
    const mockUser = {
      id: 'mock-user-id',
      email: 'admin@zygreen.io',
      user_metadata: { role: 'admin' }
    };
    
    setSession({
      access_token: 'mock-demo-token',
      user: mockUser
    });
    setProfile({
      id: mockUser.id,
      email: mockUser.email,
      role: 'admin'
    });
    
    toast.success('Bypassed credentials. Running in sandbox mode');
    navigate('/dashboard');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>🌱</div>
          <h2 className={styles.title}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className={styles.subtitle}>
            {isLogin ? 'Enter credentials to access atmospheric console' : 'Register a new device workspace'}
          </p>
        </div>

        <form onSubmit={handleAuth} className={styles.form}>
          <div className={styles.inputGroup}>
            <label><Mail size={14} /> Email Address</label>
            <input
              type="email"
              placeholder="e.g. admin@zygreen.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label><Lock size={14} /> Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {isLogin ? (
              <>
                <LogIn size={16} /> {loading ? 'Signing In...' : 'Sign In'}
              </>
            ) : (
              <>
                <UserPlus size={16} /> {loading ? 'Creating Account...' : 'Sign Up'}
              </>
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className={styles.switchBtn}
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
          
          <div className={styles.divider}>
            <span>OR Sandbox Access</span>
          </div>

          <button
            onClick={handleBypassDemo}
            className={styles.bypassBtn}
          >
            <Shield size={16} /> Bypass to Demo Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
