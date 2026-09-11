'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AGREEMENT_VERSION, OWNER, ADDRESS } from '@/lib/config';

export default function AgreementForm({ fullName }) {
  const router = useRouter();
  const [ticked, setTicked] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = ticked && typed.trim().length >= 4;

  async function accept() {
    setBusy(true); setError('');
    const supabase = supabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/signin'); return; }
    const { error: e } = await supabase.from('agreement_acceptances').insert({
      user_id: user.id,
      version: AGREEMENT_VERSION,
      typed_name: typed.trim(),
    });
    if (e && e.code !== '23505') {   // already signed is fine
      setBusy(false); setError('Could not save that. Try again.'); return;
    }
    router.replace('/welcome');
    router.refresh();
  }

  return (
    <main>
      <div className="doc">
        <h2>Gym agreement</h2>
        <p className="meta">
          Version {AGREEMENT_VERSION} · {OWNER}, {ADDRESS} · Accept this before your first session.
        </p>

        <div className="keyrule">
          <p><b>Never train alone.</b> Two or more people must be present for the whole session.
          If the second person leaves, you stop and leave too.</p>
        </div>

        <h3>Use of the gym</h3>
        <p>Access is for personal fitness use only and can be withdrawn at any time. No other part
        of the building is to be entered except in an emergency.</p>

        <h3>Risk and liability</h3>
        <p>Using gym equipment carries a real risk of injury. You take full responsibility for any
        injury or damage arising from your use of the gym, and you release {OWNER} from liability
        for it.</p>

        <h3>Rules</h3>
        <ul>
          <li>Use the equipment safely and put it back after use</li>
          <li>No guests without permission</li>
          <li>Never use the gym under the influence of alcohol or drugs</li>
          <li>Leave the premises secure — yard gates locked</li>
        </ul>

        <h3>Ending access</h3>
        <p>Either side can end this arrangement at any time.</p>

        <div className="check">
          <input type="checkbox" id="agree" checked={ticked}
            onChange={(e) => setTicked(e.target.checked)} />
          <label htmlFor="agree">
            I have read the agreement, I accept the risk is mine, and I will never use the gym on
            my own.
          </label>
        </div>

        <label className="sig" htmlFor="sig" style={{ marginTop: 16 }}>Type your full name to sign</label>
        <input id="sig" type="text" value={typed} placeholder={fullName || 'Your full name'}
          autoComplete="name" onChange={(e) => setTyped(e.target.value)} />

        <p className="err">{error}</p>
        <button className="action" type="button" disabled={!ready || busy} onClick={accept}>
          {busy ? 'Saving…' : 'Accept and continue'}
        </button>
        <p className="foot" style={{ marginTop: 12 }}>
          Your name, the version signed, and the date and time are recorded.
        </p>
      </div>
    </main>
  );
}
