export const dynamic = 'force-dynamic';
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#2dd4bf',
            colorBackground: '#0a0a0c',
            colorInputBackground: '#111114',
            colorInputText: '#e4e4e7',
            colorText: '#e4e4e7',
            colorTextSecondary: '#52525b',
            colorNeutral: '#27272a',
            borderRadius: '0px',
            fontFamily: "'JetBrains Mono', monospace",
          },
          elements: {
            card: { boxShadow: 'none', border: '1px solid #1e1e22' },
            headerTitle: { fontFamily: "'Inter', sans-serif" },
            headerSubtitle: { display: 'none' },
          },
        }}
        redirectUrl="/"
      />
    </div>
  );
}
