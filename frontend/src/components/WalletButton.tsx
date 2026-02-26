'use client';

import { useTonConnectUI } from '@tonconnect/ui-react';
import { useTonConnect } from '@/hooks/useTonConnect';
import { useEffect, useState } from 'react';

export default function WalletButton() {
  const [tonConnectUI] = useTonConnectUI();
  const { connected, shortAddress, disconnect } = useTonConnect();
  const [balance, setBalance] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!connected) {
      setBalance(null);
      return;
    }
    // Fetch balance from TON API
    const wallet = tonConnectUI.wallet;
    if (!wallet?.account?.address) return;

    fetch(
      `${process.env.NEXT_PUBLIC_TON_API_URL}/getAddressBalance?address=${wallet.account.address}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const ton = (BigInt(d.result) / 1_000_000_000n).toString();
          const nano = (BigInt(d.result) % 1_000_000_000n).toString().padStart(9, '0').slice(0, 2);
          setBalance(`${ton}.${nano} TON`);
        }
      })
      .catch(() => setBalance(null));
  }, [connected, tonConnectUI]);

  if (!connected) {
    return (
      <button
        onClick={() => tonConnectUI.openModal()}
        className="flex items-center gap-2 bg-brand-red hover:bg-brand-darkred transition-colors px-3 py-2 rounded-xl text-sm font-semibold text-white"
      >
        <WalletIcon />
        Connect
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu((v) => !v)}
        className="flex items-center gap-2 bg-[#1a0000] border border-brand-red/40 px-3 py-2 rounded-xl text-sm font-semibold text-white"
      >
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="text-brand-red">{shortAddress}</span>
      </button>

      {showMenu && (
        <div
          className="absolute right-0 top-12 bg-[#111] border border-brand-border rounded-xl p-3 min-w-[180px] shadow-xl z-50"
          onMouseLeave={() => setShowMenu(false)}
        >
          {balance && (
            <p className="text-xs text-gray-400 mb-2 px-1">Balance: {balance}</p>
          )}
          <button
            onClick={() => { disconnect(); setShowMenu(false); }}
            className="w-full text-left text-sm text-red-400 hover:text-red-300 px-1 py-1 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 12V22H4V12" />
      <path d="M22 7H2v5h20V7z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}
