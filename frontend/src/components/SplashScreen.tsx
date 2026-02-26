'use client';

import { useEffect, useState } from 'react';

interface SplashProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 800);
    const t2 = setTimeout(() => setPhase('exit'), 2000);
    const t3 = setTimeout(() => onDone(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 bg-black flex items-center justify-center z-[100] transition-opacity duration-500 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        className={`w-28 h-28 rounded-full bg-brand-red transition-all duration-700 animate-pulse-red ${
          phase === 'enter'
            ? 'opacity-0 scale-50'
            : phase === 'hold'
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-150'
        }`}
        style={{
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      />
    </div>
  );
}
