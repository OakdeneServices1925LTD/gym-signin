'use client';
import { useState } from 'react';

export default function PinPad({ onComplete, error, busy, extraKey }) {
  const [pin, setPin] = useState('');

  function tap(d) {
    if (busy || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      // let the fourth dot paint before the screen changes
      setTimeout(() => { setPin(''); onComplete(next); }, 140);
    }
  }

  return (
    <>
      <div className="dots">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={'dot' + (i < pin.length ? ' on' : '')} />
        ))}
      </div>
      <p className="err">{busy ? 'Checking…' : error || ''}</p>
      <div className="pad">
        {['1','2','3','4','5','6','7','8','9'].map((d) => (
          <button key={d} type="button" onClick={() => tap(d)}>{d}</button>
        ))}
        {extraKey || <span />}
        <button type="button" onClick={() => tap('0')}>0</button>
        <button type="button" className="ghost" onClick={() => setPin(pin.slice(0, -1))}>Delete</button>
      </div>
    </>
  );
}
