'use client';

import { useEffect, useState } from 'react';
import {
  adminGetStats,
  adminGetOrders,
  adminGetRentals,
  adminCreateAccount,
  adminDeleteAccount,
  adminCreateUsername,
  adminDeleteUsername,
  getAccounts,
  getUsernames,
  Account,
  UsernameItem,
} from '@/lib/api';

type Tab = 'stats' | 'accounts' | 'usernames' | 'orders' | 'rentals';

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('stats');

  useEffect(() => {
    // Check admin access
    adminGetStats()
      .then(() => setAllowed(true))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (allowed === false) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center flex-col gap-3">
        <div className="text-5xl">🚫</div>
        <p className="text-gray-400">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col">
      <header className="px-4 pt-4 pb-2 border-b border-brand-border">
        <h1 className="text-xl font-bold">
          Admin <span className="text-brand-red">Panel</span>
        </h1>
      </header>

      {/* Tab bar */}
      <nav className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-brand-border">
        {(['stats', 'accounts', 'usernames', 'orders', 'rentals'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t ? 'bg-brand-red text-white' : 'text-gray-400'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <main className="flex-1 px-4 py-4">
        {tab === 'stats' && <StatsTab />}
        {tab === 'accounts' && <AccountsTab />}
        {tab === 'usernames' && <UsernamesTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'rentals' && <RentalsTab />}
      </main>
    </div>
  );
}

// ---- Stats ----
function StatsTab() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { adminGetStats().then(setStats); }, []);
  if (!stats) return <Spinner />;
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: 'Total Orders', value: stats.orders.total },
        { label: 'Confirmed Orders', value: stats.orders.confirmed },
        { label: 'Total Rentals', value: stats.rentals.total },
        { label: 'Confirmed Rentals', value: stats.rentals.confirmed },
      ].map((s) => (
        <div key={s.label} className="bg-brand-card border border-brand-border rounded-xl p-4">
          <p className="text-gray-400 text-xs">{s.label}</p>
          <p className="text-2xl font-bold text-white">{s.value}</p>
        </div>
      ))}
      <div className="col-span-2 bg-[#1a0000] border border-brand-red/30 rounded-xl p-4">
        <p className="text-gray-400 text-xs">Total Revenue</p>
        <p className="text-2xl font-bold text-brand-red">{stats.revenue.ton.toFixed(2)} TON</p>
      </div>
    </div>
  );
}

// ---- Accounts Tab ----
function AccountsTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({ country: '', countryCode: '', flag: '', quantity: '', price: '' });
  const [saving, setSaving] = useState(false);

  const load = () => getAccounts().then(setAccounts);
  useEffect(() => { load(); }, []);

  const create = async () => {
    setSaving(true);
    try {
      await adminCreateAccount({
        country: form.country,
        countryCode: form.countryCode,
        flag: form.flag,
        quantity: Number(form.quantity),
        price: Number(form.price),
      });
      setForm({ country: '', countryCode: '', flag: '', quantity: '', price: '' });
      load();
    } catch (e: any) {
      alert(e.message);
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this account?')) return;
    await adminDeleteAccount(id);
    load();
  };

  return (
    <div className="space-y-4">
      {/* Create form */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-2">
        <p className="font-semibold text-sm mb-3">Add Account</p>
        {[
          { key: 'country', label: 'Country name' },
          { key: 'countryCode', label: 'Code (+41)' },
          { key: 'flag', label: 'Flag emoji (🇨🇭)' },
          { key: 'quantity', label: 'Quantity', type: 'number' },
          { key: 'price', label: 'Price (TON)', type: 'number' },
        ].map((f) => (
          <input
            key={f.key}
            type={f.type || 'text'}
            placeholder={f.label}
            value={(form as any)[f.key]}
            onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
            className="w-full bg-black border border-brand-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-red"
          />
        ))}
        <button
          onClick={create}
          disabled={saving}
          className="w-full py-2 bg-brand-red rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>

      {/* List */}
      {accounts.map((a) => (
        <div key={a.id} className="bg-brand-card border border-brand-border rounded-xl p-3 flex items-center gap-3">
          <span className="text-2xl">{a.flag}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold">{a.country} {a.countryCode}</p>
            <p className="text-xs text-gray-400">{a.quantity} pcs · {a.price} TON</p>
          </div>
          <button onClick={() => remove(a.id)} className="text-red-500 text-xs">Delete</button>
        </div>
      ))}
    </div>
  );
}

// ---- Usernames Tab ----
function UsernamesTab() {
  const [usernames, setUsernames] = useState<UsernameItem[]>([]);
  const [form, setForm] = useState({ username: '', priceDay: '', priceWeek: '', priceMonth: '' });
  const [saving, setSaving] = useState(false);

  const load = () => getUsernames().then(setUsernames);
  useEffect(() => { load(); }, []);

  const create = async () => {
    setSaving(true);
    try {
      await adminCreateUsername({
        username: form.username,
        priceDay: Number(form.priceDay),
        priceWeek: Number(form.priceWeek),
        priceMonth: Number(form.priceMonth),
      });
      setForm({ username: '', priceDay: '', priceWeek: '', priceMonth: '' });
      load();
    } catch (e: any) {
      alert(e.message);
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete?')) return;
    await adminDeleteUsername(id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-2">
        <p className="font-semibold text-sm mb-3">Add Username</p>
        {[
          { key: 'username', label: '@username' },
          { key: 'priceDay', label: 'Price/day (TON)', type: 'number' },
          { key: 'priceWeek', label: 'Price/week (TON)', type: 'number' },
          { key: 'priceMonth', label: 'Price/month (TON)', type: 'number' },
        ].map((f) => (
          <input
            key={f.key}
            type={f.type || 'text'}
            placeholder={f.label}
            value={(form as any)[f.key]}
            onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
            className="w-full bg-black border border-brand-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-red"
          />
        ))}
        <button onClick={create} disabled={saving}
          className="w-full py-2 bg-brand-red rounded-lg text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>

      {usernames.map((u) => (
        <div key={u.id} className="bg-brand-card border border-brand-border rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-red">{u.username}</p>
            <p className="text-xs text-gray-400">
              {u.priceDay}/{u.priceWeek}/{u.priceMonth} TON · {u.occupied ? '🔴 Occupied' : '🟢 Free'}
            </p>
          </div>
          <button onClick={() => remove(u.id)} className="text-red-500 text-xs">Delete</button>
        </div>
      ))}
    </div>
  );
}

// ---- Orders Tab ----
function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => { adminGetOrders().then(setOrders); }, []);
  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <div key={o.id} className="bg-brand-card border border-brand-border rounded-xl p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold">{o.account?.country} {o.account?.countryCode}</span>
            <StatusBadge status={o.status} />
          </div>
          <p className="text-gray-400">TG: {o.telegramId}</p>
          <p className="text-gray-400">{o.tonAmount} TON</p>
          <p className="text-gray-600 truncate">{o.txHash}</p>
        </div>
      ))}
    </div>
  );
}

// ---- Rentals Tab ----
function RentalsTab() {
  const [rentals, setRentals] = useState<any[]>([]);
  useEffect(() => { adminGetRentals().then(setRentals); }, []);
  return (
    <div className="space-y-2">
      {rentals.map((r) => (
        <div key={r.id} className="bg-brand-card border border-brand-border rounded-xl p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold text-brand-red">{r.username?.username}</span>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-gray-400">TG: {r.telegramId} · {r.period}</p>
          <p className="text-gray-400">{r.tonAmount} TON</p>
          {r.expiresAt && <p className="text-gray-500">Expires: {new Date(r.expiresAt).toLocaleString()}</p>}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-900/40 text-yellow-400',
    CONFIRMED: 'bg-green-900/40 text-green-400',
    FAILED: 'bg-red-900/40 text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[status] || ''}`}>
      {status}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
