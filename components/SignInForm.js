'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PinPad from '@/components/PinPad';
import { supabaseBrowser } from '@/lib/supabase/client';
import { pinAuth } from '@/lib/pinAuth';

export default function SignInForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // The lads use the same phone every time. Save them typing it.
  useEffect(() => {
    const saved = window.localStorage.getItem('gym.username');
    if (saved) setUsername(saved);
  }, []);

  async function submit(pin) {
    const u = username.trim().toLowerCase();
    if (!u) { setError('Enter your username first.'); return; }
    setBusy(true); setError('');
    const res = await pinAuth({ action: 'login', username: u, pin });
    if (res.error) { setBusy(false); setError(res.error); return; }
    window.localStorage.setItem('gym.username', u);
    const supabase = supabaseBrowser();
    const { error: e } = await supabase.auth.setSession(res.session);
    if (e) { setBusy(false); setError('Could not start your session. Try again.'); return; }
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="login">
      <div className="field">
        <label htmlFor="u">Username</label>
        <input
          id="u" type="text" value={username} placeholder="firstname.lastname"
          autoCapitalize="none" autoCorrect="off" spellCheck="false"
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <p className="pinlabel">Enter your 4-digit PIN</p>
      <PinPad onComplete={submit} error={error} busy={busy} />
      <p className="foot">
        First time here? <Link href="/setup">Set up your account</Link><br />
        Five wrong PINs locks it for 15 minutes. An admin can reset it.
      </p>
    </main>
  );
}
