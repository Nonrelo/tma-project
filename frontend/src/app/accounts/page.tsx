'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Account, buyAccount, getAccounts, getOrderStatus } from '@/lib/api';
import { useTonConnect } from '@/hooks/useTonConnect';
import WalletButton from '@/components/WalletButton';

type Status = 'idle' | 'buying' | 'polling' | 'success' | 'error';

export default function AccountsPage() {
  const router = useRouter();
  const { connected, address, sendPayment } = useTonConnect();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMap, setStatusMap] = useState<Record<number, Status>>({});
  const [errorMap, setErrorMap] = useState<Record<number, string>>({});

  useEffect(() => {
    getAccounts()
      .then(setAccounts)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.Telegram?.WebApp?.BackButton?.show();
    window.Telegram?.WebApp?.BackButton?.onClick(() => router.push('/'));
    return () => window.Telegram?.WebApp?.BackButton?.hide();
  }, [router]);

  const handleBuy = async (account: Account) => {
    if (!connected || !address) {
      window.Telegram?.WebApp?.showAlert('Please connect your TON wallet first.');
      return;
    }

    setStatusMap((m) => ({ ...m, [account.id]: 'buying' }));
    setErrorMap((m) => ({ ...m, [account.id]: '' }));

    try {
      // 1. Send transaction via TON Connect
      const boc = await sendPayment({ amountTon: account.price });

      setStatusMap((m) => ({ ...m, [account.id]: 'polling' }));

      // 2. Submit to backend
      const { orderId } = await buyAccount(account.id, address, boc);

      // 3. Poll for confirmation
      let attempts = 0;
      const poll = async (): Promise<void> => {
        if (attempts++ > 30) {
          setStatusMap((m) => ({ ...m, [account.id]: 'error' }));
          setErrorMap((m) => ({ ...m, [account.id]: 'Verification timeout. Contact support.' }));
          return;
        }
        await new Promise((r) => setTimeout(r, 4000));
        const order = await getOrderStatus(orderId);
        if (order.status === 'CONFIRMED') {
          setStatusMap((m) => ({ ...m, [account.id]: 'success' }));
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
          setAccounts((prev) =>
            prev.map((a) => (a.id === account.id ? { ...a, quantity: a.quantity - 1 } : a))
          );
        } else if (order.status === 'FAILED') {
          setStatusMap((m) => ({ ...m, [account.id]: 'error' }));
          setErrorMap((m) => ({ ...m, [account.id]: 'Payment not verified. Contact support.' }));
        } else {
          return poll();
        }
      };
      await poll();
    } catch (err: any) {
      setStatusMap((m) => ({ ...m, [account.id]: 'error' }));
      setErrorMap((m) => ({ ...m, [account.id]: err.message || 'Transaction cancelled.' }));
    }
  };

  return (
    <div className="min-h-dvh bg-black flex flex-col">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <button onClick={() => router.push('/')} className="text-brand-red text-sm mb-1">
            ← Back
          </button>
          <h1 className="text-xl font-bold">Accounts</h1>
        </div>
        <WalletButton />
      </header>

      <main className="flex-1 px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && accounts.length === 0 && (
          <p className="text-center text-gray-500 py-16">No accounts available</p>
        )}

        {accounts.map((account) => {
          const st = statusMap[account.id] || 'idle';
          const err = errorMap[account.id];
          return (
            <div
              key={account.id}
              className="bg-brand-card border border-brand-border rounded-2xl p-4 animate-scale-in"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{account.flag}</span>
                <div className="flex-1">
                  <p className="font-semibold">{account.country}</p>
                  <p className="text-gray-400 text-sm">{account.countryCode}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-red">{account.price} TON</p>
                  <p className="text-xs text-gray-500">{account.quantity} left</p>
                </div>
              </div>

              {err && <p className="text-red-400 text-xs mb-2">{err}</p>}

              {st === 'success' ? (
                <div className="flex items-center justify-center gap-2 py-2 text-green-400 text-sm font-semibold">
                  ✓ Purchase successful!
                </div>
              ) : (
                <button
                  onClick={() => handleBuy(account)}
                  disabled={st !== 'idle' || account.quantity < 1}
                  className="w-full py-3 bg-brand-red hover:bg-brand-darkred disabled:opacity-50 disabled:cursor-not-allowed
                    rounded-xl font-semibold transition-colors text-sm"
                >
                  {st === 'buying'
                    ? 'Confirm in wallet…'
                    : st === 'polling'
                    ? 'Verifying…'
                    : account.quantity < 1
                    ? 'Out of stock'
                    : 'Buy'}
                </button>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
