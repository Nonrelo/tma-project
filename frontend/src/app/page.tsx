'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SplashScreen from '@/components/SplashScreen';
import WalletButton from '@/components/WalletButton';

export default function HomePage() {
  const [splashDone, setSplashDone] = useState(false);
  const router = useRouter();
  const onSplashDone = useCallback(() => setSplashDone(true), []);

  return (
    <>
      {!splashDone && <SplashScreen onDone={onSplashDone} />}

      <div
        className={`min-h-dvh bg-black flex flex-col transition-opacity duration-500 ${
          splashDone ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h1 className="text-xl font-bold text-white">Static Shop</h1>
            <p className="text-xs text-gray-500">Powered by TON</p>
          </div>
          <WalletButton />
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center gap-5 px-4 pb-8">
          <p className="text-gray-400 text-sm mb-2">Choose a section</p>

          <NavCard
            title="Accounts"
            description="Buy Telegram accounts by country"
            icon="🌍"
            onClick={() => router.push('/accounts')}
          />
          <NavCard
            title="Rent Usernames"
            description="Rent premium @usernames"
            icon="✨"
            onClick={() => router.push('/usernames')}
          />
        </main>

        <footer className="text-center pb-6 text-xs text-gray-700">
  All payments in TON
  <br/>
  <a href="/admin" className="text-gray-800 text-xs">⚙️</a>
        </footer>
      </div>
    </>
  );
}

function NavCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full max-w-sm bg-brand-card border border-brand-border rounded-2xl p-5 text-left
        active:scale-95 transition-transform duration-150
        hover:border-brand-red/50 hover:shadow-[0_0_20px_rgba(255,0,0,0.1)]"
      style={{ animation: 'scaleIn 0.4s ease forwards' }}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#1a0000] rounded-xl flex items-center justify-center text-2xl">
          {icon}
        </div>
        <div>
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
        <div className="ml-auto text-brand-red opacity-60">›</div>
      </div>
    </button>
  );
}
