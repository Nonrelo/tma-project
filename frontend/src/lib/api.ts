const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

function getInitData(): string {
  if (typeof window === 'undefined') return '';
  return window.Telegram?.WebApp?.initData || '';
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const initData = getInitData();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(initData && { Authorization: `tma ${encodeURIComponent(initData)}` }),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data as T;
}

// ---- Accounts ----

export interface Account {
  id: number;
  country: string;
  countryCode: string;
  flag: string;
  quantity: number;
  price: number;
}

export const getAccounts = () => apiFetch<Account[]>('/accounts');

export const buyAccount = (id: number, walletAddress: string, boc: string) =>
  apiFetch<{ orderId: number; txHash: string; status: string }>(`/accounts/${id}/buy`, {
    method: 'POST',
    body: JSON.stringify({ walletAddress, boc }),
  });

export const getOrderStatus = (orderId: number) =>
  apiFetch<{ id: number; status: string }>(`/accounts/orders/${orderId}`);

// ---- Usernames ----

export interface UsernameItem {
  id: number;
  username: string;
  priceDay: number;
  priceWeek: number;
  priceMonth: number;
  occupied: boolean;
  currentRental: { period: string; expiresAt: string } | null;
}

export const getUsernames = () => apiFetch<UsernameItem[]>('/usernames');

export const rentUsername = (
  id: number,
  walletAddress: string,
  boc: string,
  period: 'DAY' | 'WEEK' | 'MONTH'
) =>
  apiFetch<{ rentalId: number; txHash: string; status: string }>(`/usernames/${id}/rent`, {
    method: 'POST',
    body: JSON.stringify({ walletAddress, boc, period }),
  });

export const getRentalStatus = (rentalId: number) =>
  apiFetch<{ id: number; status: string; expiresAt: string | null }>(
    `/usernames/rentals/${rentalId}`
  );

// ---- Admin ----

export const adminGetOrders = () => apiFetch<any[]>('/admin/orders');
export const adminGetRentals = () => apiFetch<any[]>('/admin/rentals');
export const adminGetStats = () => apiFetch<any>('/admin/stats');

export const adminCreateAccount = (data: Omit<Account, 'id'>) =>
  apiFetch<Account>('/accounts', { method: 'POST', body: JSON.stringify(data) });

export const adminUpdateAccount = (id: number, data: Partial<Omit<Account, 'id'>>) =>
  apiFetch<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const adminDeleteAccount = (id: number) =>
  apiFetch<{ ok: boolean }>(`/accounts/${id}`, { method: 'DELETE' });

export const adminCreateUsername = (data: {
  username: string;
  priceDay: number;
  priceWeek: number;
  priceMonth: number;
}) =>
  apiFetch<UsernameItem>('/usernames', { method: 'POST', body: JSON.stringify(data) });

export const adminUpdateUsername = (id: number, data: any) =>
  apiFetch<UsernameItem>(`/usernames/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const adminDeleteUsername = (id: number) =>
  apiFetch<{ ok: boolean }>(`/usernames/${id}`, { method: 'DELETE' });
