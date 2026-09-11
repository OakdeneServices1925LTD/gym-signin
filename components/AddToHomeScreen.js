'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = {
  ios: [
    'Open this page in <b>Safari</b>, not inside WhatsApp',
    'Tap <b>Share</b> — the square with the arrow out of the top',
    'Scroll down and tap <b>Add to Home Screen</b>',
    'Tap <b>Add</b>. The icon lands on your home screen.',
  ],
  android: [
    'Open this page in <b>Chrome</b>',
    'Tap the <b>⋮</b> menu, top right',
    'Tap <b>Add to Home screen</b>',
    'Tap <b>Add</b>, then <b>Add automatically</b>.',
  ],
};

export default function AddToHomeScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('ios');

  useEffect(() => {
    if (/android/i.test(navigator.userAgent)) setPhone('android');
  }, []);

  return (
    <main className="login" style={{ maxWidth: 400 }}>
      <h2 style={{ fontSize: 21, color: '#fff', marginBottom: 6 }}>Put it on your home screen</h2>
      <p className="hint" style={{ margin: '0 0 16px' }}>
        Ten seconds, and you never have to find the link again. It opens like an app and stays
        signed in.
      </p>

      <div style={{ marginBottom: 12 }}>
        {['ios', 'android'].map((k) => (
          <button key={k} type="button" className="phone" aria-pressed={phone === k}
            onClick={() => setPhone(k)}>
            {k === 'ios' ? 'iPhone' : 'Android'}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 0, textAlign: 'left' }}>
        {STEPS[phone].map((s, i) => (
          <div className="step" key={i}>
            <u>{i + 1}</u>
            <span dangerouslySetInnerHTML={{ __html: s }} />
          </div>
        ))}
      </div>

      <button className="action" type="button" onClick={() => router.replace('/gym')}>Done</button>
    </main>
  );
}
