'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UsernameItem, getUsernames, rentUsername, getRentalStatus } from '@/lib/api';
import { useTonConnect } from '@/hooks/useTonConnect';
import WalletButton from '@/components/WalletButton';

type Period = 'DAY' | 'WEEK' | 'MONTH';
type Status = 'idle' | 'renting' | 'polling' | 'success' | 'error';

const PERIOD_LABELS: Record<Period, string> = {
  DAY: '1 Day',
  WEEK: '1 Week',
  MONTH: '1 Month',
};

export default function UsernamesPage() {
  const router = useRouter();
  const { connected, address, sendPayment } = useTonConnect();
  const [usernames, setUsernames] = useState<UsernameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodMap, setPeriodMap] = useState<Record<number, Period>>({});
  const [statusMap, setStatusMap] = useState<Record<number, Status>>({});
  const [errorMap, setErrorMap] = useState<Record<number, string>>({});

  useEffect(() => {
    getUsernames()
      .then(setUsernames)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.Telegram?.WebApp?.BackButton?.show();
    window.Telegram?.WebApp?.BackButton?.onClick(() => router.push('/'));
    return () => window.Telegram?.WebApp?.BackButton?.hide();
  }, [router]);

  const getPrice = (un: UsernameItem, period: Period) => {
    return { DAY: un.priceDay, WEEK: un.priceWeek, MONTH: un.priceMonth }[period];
  };

  const handleRent = async (un: UsernameItem) => {
    const period = periodMap[un.id] || 'DAY';
    if (!connected || !address) {
      window.Telegram?.WebApp?.showAlert('Please connect your TON wallet first.');
      return;
    }

    setStatusMap((m) => ({ ...m, [un.id]: 'renting' }));
    setErrorMap((m) => ({ ...m, [un.id]: '' }));

    try {
      const price = getPrice(un, period);
      const boc = await sendPayment({ amountTon: price });

      setStatusMap((m) => ({ ...m, [un.id]: 'polling' }));
      const { rentalId } = await rentUsername(un.id, address, boc, period);

      // Poll
      let attempts = 0;
      const poll = async (): Promise<void> => {
        if (attempts++ > 30) {
          setStatusMap((m) => ({ ...m, [un.id]: 'error' }));
          setErrorMap((m) => ({ ...m, [un.id]: 'Timeout. Contact support.' }));
          return;
        }
        await new Promise((r) => setTimeout(r, 4000));
        const rental = await getRentalStatus(rentalId);
        if (rental.status === 'CONFIRMED') {
          setStatusMap((m) => ({ ...m, [un.id]: 'success' }));
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
          setUsernames((prev) =>
            prev.map((u) =>
              u.id === un.id
                ? { ...u, occupied: true, currentRental: { period, expiresAt: rental.expiresAt! } }
                : u
            )
          );
        } else if (rental.status === 'FAILED') {
          setStatusMap((m) => ({ ...m, [un.id]: 'error' }));
          setErrorMap((m) => ({ ...m, [un.id]: 'Payment not verified.' }));
        } else {
          return poll();
        }
      };
      await poll();
    } catch (err: any) {
      setStatusMap((m) => ({ ...m, [un.id]: 'error' }));
      setErrorMap((m) => ({ ...m, [un.id]: err.message || 'Transaction cancelled.' }));
    }
  };

  return (
    <div className="min-h-dvh bg-black flex flex-col">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <button onClick={() => router.push('/')} className="text-brand-red text-sm mb-1">
            ← Back
          </button>
          <h1 className="text-xl font-bold">Rent Usernames</h1>
        </div>
        <WalletButton />
      </header>

      <main className="flex-1 px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && usernames.length === 0 && (
          <p className="text-center text-gray-500 py-16">No usernames available</p>
        )}

        {usernames.map((un) => {
          const period = periodMap[un.id] || 'DAY';
          const st = statusMap[un.id] || 'idle';
          const err = errorMap[un.id];
          const price = getPrice(un, period);

          return (
            <div key={un.id} className="bg-brand-card border border-brand-border rounded-2xl p-4 animate-scale-in">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-brand-red text-lg">{un.username}</span>
                {un.occupied ? (
                  <span className="text-xs bg-yellow-900/40 text-yellow-400 px-2 py-1 rounded-full">
                    Occupied
                  </span>
                ) : (
                  <span className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded-full">
                    Available
                  </span>
                )}
              </div>

              {un.occupied && un.currentRental && (
                <p className="text-xs text-gray-500 mb-3">
                  Available after: {new Date(un.currentRental.expiresAt).toLocaleDateString()}
                </p>
              )}

              {/* Period selector */}
              <div className="flex gap-2 mb-3">
                {(['DAY', 'WEEK', 'MONTH'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodMap((m) => ({ ...m, [un.id]: p }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      period === p
                        ? 'bg-brand-red text-white'
                        : 'bg-[#1a0000] text-gray-400 border border-brand-border'
                    }`}
                  >
                    <div>{PERIOD_LABELS[p]}</div>
                    <div className="text-[10px] opacity-80">{getPrice(un, p)} TON</div>
                  </button>
                ))}
              </div>

              {err && <p className="text-red-400 text-xs mb-2">{err}</p>}

              {st === 'success' ? (
                <div className="flex items-center justify-center gap-2 py-2 text-green-400 text-sm font-semibold">
                  ✓ Rental confirmed!
                </div>
              ) : (
                <button
                  onClick={() => handleRent(un)}
                  disabled={st !== 'idle' || un.occupied}
                  className="w-full py-3 bg-brand-red hover:bg-brand-darkred disabled:opacity-50 disabled:cursor-not-allowed
                    rounded-xl font-semibold transition-colors text-sm"
                >
                  {st === 'renting'
                    ? 'Confirm in wallet…'
                    : st === 'polling'
                    ? 'Verifying…'
                    : un.occupied
                    ? 'Currently occupied'
                    : `Rent for ${price} TON`}
                </button>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
