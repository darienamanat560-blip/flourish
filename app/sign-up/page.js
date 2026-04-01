'use client';
export const dynamic = 'force-dynamic';

import { useSignUp, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const T = '#2dd4bf';

function Logo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:40 }}>
      <svg width="14" height="20" viewBox="0 0 24 34" fill="none">
        <rect x="6" y="1" width="12" height="5" rx="1" fill={T}/>
        <path d="M7 6V9H17V6" stroke={T} strokeWidth="1.5" fill="none"/>
        <path d="M7 9V28C7 30.76 9.24 33 12 33C14.76 33 17 30.76 17 28V9" stroke={T} strokeWidth="1.5" fill="none"/>
        <path d="M8.5 18V28C8.5 29.93 10.07 31.5 12 31.5C13.93 31.5 15.5 29.93 15.5 28V18H8.5Z" fill={T}/>
      </svg>
      <span style={{ fontSize:16, fontFamily:"'Inter',sans-serif", color:'#fff', letterSpacing:'-0.02em' }}>
        <b>flour</b><span style={{ fontWeight:300 }}>ish</span>
      </span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.4-150.3-109.2c-52.1-75.2-96-191.2-96-302.9 0-154.8 101.1-237 199.7-237 54.3 0 99.6 36.7 133.8 36.7 32.4 0 83.7-38.7 145.3-38.7 22.5 0 108.1 2 166.9 81.4zm-158.2-140.3c27.1-30.9 45.4-73.1 45.4-115.2 0-5.8-.6-11.7-1.7-17.2-42.8 1.7-94.3 28.3-125.6 63.4-24.1 26.7-45.4 68.9-45.4 111.8 0 6.4.6 12.9 2.3 18.2 3.2.6 6.5.9 9.7.9 38.4 0 86.7-24.8 115.3-61.9z"/>
    </svg>
  );
}

// OTP input — 6 individual boxes
function OTPInput({ value, onChange }) {
  const refs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];
  const digits = (value + '      ').slice(0,6).split('');

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = value.slice(0,-1);
      onChange(next);
      if (i > 0) refs[i-1].current?.focus();
    } else if (/^\d$/.test(e.key)) {
      const next = (value + e.key).slice(0,6);
      onChange(next);
      if (i < 5 && next.length > i+1) refs[i+1].current?.focus();
    }
    e.preventDefault();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    onChange(pasted);
    if (pasted.length > 0) refs[Math.min(pasted.length, 5)].current?.focus();
    e.preventDefault();
  };

  return (
    <div style={{ display:'flex', gap:10, justifyContent:'center', margin:'28px 0' }}>
      {digits.map((d, i) => (
        <input
          key={i} ref={refs[i]}
          type="text" inputMode="numeric" maxLength={1}
          value={d.trim()} readOnly
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          onClick={() => refs[i].current?.focus()}
          style={{
            width: 52, height: 60, textAlign: 'center', fontSize: 22,
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
            background: d.trim() ? 'rgba(45,212,191,0.04)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${d.trim() ? 'rgba(45,212,191,0.3)' : '#1e1e22'}`,
            color: '#fff', outline: 'none', cursor: 'text',
            transition: 'border-color 0.2s, background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

export default function SignUpPage() {
  const { signUp, isLoaded } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState('options'); // 'options' | 'email' | 'verify'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (isSignedIn) router.replace('/');
  }, [isSignedIn]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleGoogle = async () => {
    if (!isLoaded) return;
    setError('');
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (e) {
      setError(e.errors?.[0]?.message || 'Google sign up failed');
    }
  };

  const handleApple = async () => {
    if (!isLoaded) return;
    setError('');
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (e) {
      setError(e.errors?.[0]?.message || 'Apple sign up failed');
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded || !email || !password) return;
    setError(''); setLoading(true);
    try {
      await signUp.create({
        firstName: name.split(' ')[0] || '',
        lastName: name.split(' ').slice(1).join(' ') || '',
        emailAddress: email,
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('verify');
      setResendCooldown(60);
    } catch (e) {
      setError(e.errors?.[0]?.longMessage || e.errors?.[0]?.message || 'Sign up failed');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!isLoaded || code.length < 6) return;
    setError(''); setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        router.replace('/');
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (e) {
      setError(e.errors?.[0]?.longMessage || e.errors?.[0]?.message || 'Invalid code');
      setCode('');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setResendCooldown(60);
    } catch (e) {
      setError('Could not resend code');
    }
  };

  const inputStyle = {
    width: '100%', height: 48,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid #1e1e22', padding: '0 16px', color: '#e4e4e7',
    fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
    outline: 'none', marginBottom: 10, boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 600, color: '#52525b',
    textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#000', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(45,212,191,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,0.02) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}/>

      <div className="auth-card" style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        <Logo />

        {/* ── Step: verify ── */}
        {step === 'verify' ? (
          <>
            <div style={{ textAlign:'center', marginBottom:8 }}>
              <div style={{ width:48, height:48, background:'rgba(45,212,191,0.08)', border:'1px solid rgba(45,212,191,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                <svg width="20" height="20" fill="none" stroke={T} strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h1 style={{ fontSize:22, fontWeight:700, color:'#fff', fontFamily:"'Inter',sans-serif", margin:'0 0 6px', letterSpacing:'-0.02em' }}>
                Check your email
              </h1>
              <p style={{ fontSize:12, color:'#3f3f46', margin:0, lineHeight:1.6 }}>
                We sent a 6-digit code to<br/>
                <span style={{ color:'#71717a' }}>{email}</span>
              </p>
            </div>

            {error && <div className="auth-error" style={{ marginTop:16 }}>{error}</div>}

            <OTPInput value={code} onChange={setCode} />

            <button
              className="auth-btn-primary"
              onClick={handleVerify}
              disabled={loading || code.length < 6}
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <div style={{ textAlign:'center', marginTop:20 }}>
              <button onClick={handleResend} disabled={resendCooldown > 0}
                style={{ background:'transparent', border:'none', color: resendCooldown > 0 ? '#27272a' : '#52525b', fontSize:11, cursor: resendCooldown > 0 ? 'default' : 'pointer', fontFamily:"'JetBrains Mono',monospace" }}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>

            <button onClick={() => { setStep('email'); setCode(''); setError(''); }}
              style={{ width:'100%', marginTop:12, padding:'10px 0', background:'transparent', border:'none', color:'#3f3f46', fontSize:11, cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>
              ← Change email
            </button>
          </>
        ) : step === 'email' ? (
          <>
            <h1 style={{ fontSize:22, fontWeight:700, color:'#fff', fontFamily:"'Inter',sans-serif", margin:'0 0 6px', letterSpacing:'-0.02em' }}>
              Create account
            </h1>
            <p style={{ fontSize:12, color:'#3f3f46', margin:'0 0 28px' }}>
              Start tracking your protocol
            </p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleEmailSubmit}>
              <div style={{ marginBottom:10 }}>
                <label style={labelStyle}>Name</label>
                <input className="auth-input" type="text" value={name}
                  onChange={e => setName(e.target.value)} placeholder="Your name"
                  autoFocus style={inputStyle}
                  onFocus={e => e.target.style.borderColor='rgba(45,212,191,0.5)'}
                  onBlur={e => e.target.style.borderColor='#1e1e22'}/>
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={labelStyle}>Email</label>
                <input className="auth-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
                  required style={inputStyle}
                  onFocus={e => e.target.style.borderColor='rgba(45,212,191,0.5)'}
                  onBlur={e => e.target.style.borderColor='#1e1e22'}/>
              </div>
              <div style={{ marginBottom:24 }}>
                <label style={labelStyle}>Password</label>
                <input className="auth-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters"
                  required minLength={8} style={inputStyle}
                  onFocus={e => e.target.style.borderColor='rgba(45,212,191,0.5)'}
                  onBlur={e => e.target.style.borderColor='#1e1e22'}/>
              </div>
              <button type="submit" className="auth-btn-primary"
                disabled={loading || !email || password.length < 8}>
                {loading ? 'Creating account...' : 'Continue'}
              </button>
              <button type="button" onClick={() => { setStep('options'); setError(''); }}
                style={{ width:'100%', marginTop:10, padding:'10px 0', background:'transparent', border:'none', color:'#3f3f46', fontSize:11, cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>
                ← Back
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 style={{ fontSize:22, fontWeight:700, color:'#fff', fontFamily:"'Inter',sans-serif", margin:'0 0 6px', letterSpacing:'-0.02em' }}>
              Get started
            </h1>
            <p style={{ fontSize:12, color:'#3f3f46', margin:'0 0 32px' }}>
              Track your compounds, bloodwork & progress
            </p>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-btn-social" onClick={handleGoogle} style={{ marginBottom:10 }}>
              <GoogleIcon /> Continue with Google
            </button>
            <button className="auth-btn-social" onClick={handleApple}>
              <AppleIcon /> Continue with Apple
            </button>

            <div className="auth-divider">
              <span style={{ fontSize:10, color:'#27272a', textTransform:'uppercase', letterSpacing:'0.1em' }}>or</span>
            </div>

            <button className="auth-btn-social" onClick={() => setStep('email')}>
              Sign up with email
            </button>
          </>
        )}

        <p style={{ textAlign:'center', fontSize:11, color:'#27272a', marginTop:32 }}>
          Already have an account?{' '}
          <Link href="/sign-in" style={{ color:T, textDecoration:'none' }}>Sign in</Link>
        </p>

        <p style={{ textAlign:'center', fontSize:10, color:'#1e1e22', marginTop:16, lineHeight:1.6 }}>
          By continuing you agree to our terms of service
        </p>
      </div>
    </div>
  );
}
