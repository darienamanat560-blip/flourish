'use client';
export const dynamic = 'force-dynamic';

import { useClerk } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const T = '#2dd4bf';

export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();

  useEffect(() => {
    handleRedirectCallback({
      afterSignInUrl: '/',
      afterSignUpUrl: '/',
    }).catch(() => router.replace('/sign-in'));
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <div style={{
        width: 32, height: 32,
        border: '2px solid #1e1e22',
        borderTopColor: T,
        borderRadius: '50%',
        animation: 'spin .7s linear infinite',
      }}/>
      <p style={{ fontSize: 11, color: '#27272a', fontFamily: "'JetBrains Mono', monospace" }}>
        Completing sign in...
      </p>
    </div>
  );
}
