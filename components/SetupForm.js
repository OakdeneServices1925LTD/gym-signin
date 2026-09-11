'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PinPad from '@/components/PinPad';
import { supabaseBrowser } from '@/lib/supabase/client';
import { pinAuth } from '@/lib/pinAuth';

export default function SetupForm() {
  const router = useRouter();
  const [stage, setStage] = useState('who');   // who -> choose -> confirm
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function start() {
    const u = username.trim().toLowerCase();
    if (!/^[a-z]+\.[a-z]+[0-9]*$/.test(u)) {
      setError('Username looks like firstname.lastname'); return;
    }
    if (!/^[0-9]{6}$/.test(code.trim())) {
      setError('The setup code is 6 digits'); return;
    }
    setUsername(u); setError(''); setStage('choose');
  }

  async function pinEntered(pin) {
    if (stage === 'choose') {
      if (['1234', '0000', '1111'].includes(pin)) {
        setError('Pick something less obvious.'); return;
      }
      setFirst(pin); setError(''); setStage('confirm'); return;
    }
    if (pin !== first) {
      setFirst(''); setStage('choose');
      setError("Those didn't match. Start again."); return;
    }
    setBusy(true); setError('');
    const res = await pinAuth({ action: 'activate', username, code: code.trim(), pin });
    if (res.error) {
      setBusy(false); setFirst(''); setStage('choose'); setError(res.error); return;
    }
    const supabase = supabaseBrowser();
    const { error: e } = await supabase.auth.setSession(res.session);
    if (e) { setBusy(false); setError('Could not start your session. Try again.'); return; }
    window.localStorage.setItem('gym.username', username);
    router.replace('/agreement');
    router.refresh();
  }

  if (stage === 'who') {
    return (
      <main className="login">
        <h2 style={{ fontSize: 21, color: '#fff', marginBottom: 6 }}>Set up your account</h2>
        <p className="hint" style={{ margin: '0 0 18px' }}>
          One time only. You need the username and code the admin gave you.
        </p>
        <div className="field">
          <label htmlFor="u">Username</label>
          <input id="u" type="text" value={username} placeholder="firstname.lastname"
            autoCapitalize="none" autoCorrect="off" spellCheck="false"
            onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="c">Setup code</label>
          <input id="c" type="tel" inputMode="numeric" maxLength={6} value={code}
            placeholder="6 digits" onChange={(e) => setCode(e.target.value)} />
          <p className="hint">Lost it? Ask an admin to issue a new one.</p>
        </div>
        <p className="err">{error}</p>
        <button className="action" type="button" onClick={start}>Continue</button>
        <p className="foot">Already set up? <Link href="/signin">Sign in with your PIN</Link></p>
      </main>
    );
  }

  return (
    <main className="login">
      <h2 style={{ fontSize: 21, color: '#fff', marginBottom: 6 }}>
        {stage === 'choose' ? 'Choose a 4-digit PIN' : 'Enter it again'}
      </h2>
      <p className="hint" style={{ margin: '0 0 20px' }}>
        {stage === 'choose'
          ? "You'll use this every time you sign in at the door."
          : 'Just to be sure you have it.'}
      </p>
      <PinPad onComplete={pinEntered} error={error} busy={busy} />
      <p className="foot">Nobody else can see your PIN, including the admin.</p>
    </main>
  );
}
