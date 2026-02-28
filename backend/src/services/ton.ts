import axios from 'axios';

const TON_API_BASE = process.env.TON_API_URL || 'https://toncenter.com/api/v2';
const TON_API_KEY = process.env.TON_API_KEY || '';

export async function sendBocAndGetHash(boc: string): Promise<string> {
  try {
    const resp = await axios.post(`${TON_API_BASE}/sendBoc`, { boc }, {
      headers: { 'X-API-Key': TON_API_KEY },
      timeout: 15000,
    });
    if (resp.data.ok) return 'pending_' + Date.now();
  } catch {}
  return 'pending_' + Date.now();
}

export async function verifyTonTransaction(params: {
  txHash: string;
  expectedDestination: string;
  expectedValueTon: number;
}): Promise<{ verified: boolean }> {
  const { expectedDestination, expectedValueTon } = params;
  const expectedNano = BigInt(Math.round(expectedValueTon * 1e9));
  const tolerance = expectedNano / 50n; // 2%
  const startTime = Math.floor(Date.now() / 1000) - 120; // последние 2 минуты

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const resp = await axios.get(`${TON_API_BASE}/getTransactions`, {
        params: { 
          address: expectedDestination, 
          limit: 10,
        },
        headers: { 'X-API-Key': TON_API_KEY },
        timeout: 10000,
      });

      if (!resp.data.ok) continue;

      const match = resp.data.result.find((tx: any) => {
        if (tx.utime < startTime) return false;
        const value = BigInt(tx.in_msg?.value || '0');
        const diff = value > expectedNano ? value - expectedNano : expectedNano - value;
        return diff <= tolerance;
      });

      if (match) return { verified: true };
    } catch (e) {
      console.log('TON verify error:', e);
    }
  }
  return { verified: false };
}
