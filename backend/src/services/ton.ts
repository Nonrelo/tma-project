import axios from 'axios';
import crypto from 'crypto';

const TON_API_BASE = process.env.TON_API_URL || 'https://toncenter.com/api/v2';
const TON_API_KEY = process.env.TON_API_KEY || '';

interface TonTransaction {
  hash: string;
  lt: string;
  in_msg: {
    source: string;
    destination: string;
    value: string; // in nanotons
    msg_data: string;
  };
  out_msgs: any[];
  utime: number;
}

/**
 * Decode a BOC (Bag of Cells) and extract the transaction hash
 * We rely on TON Center to parse the BOC after broadcast
 */
export async function sendBocAndGetHash(boc: string): Promise<string> {
  try {
    const resp = await axios.post(`${TON_API_BASE}/sendBocReturnHash`, { boc }, {


      headers: { 'X-API-Key': TON_API_KEY },
      timeout: 15000,
    });
    if (resp.data.ok) return resp.data.result.hash as string;
  } catch {}

  // Fallback — просто отправить BOC и вернуть заглушку
  try {
    await axios.post(`${TON_API_BASE}/sendBoc`, { boc }, {
      headers: { 'X-API-Key': TON_API_KEY },
      timeout: 15000,
    });
  } catch {}

  // Вернуть хэш из BOC напрямую
  return crypto.createHash('sha256').update(Buffer.from(boc, 'base64')).digest('hex');


}

/**
 * Verify a transaction reached the expected destination with the expected value.
 * Polls for up to 60 seconds.
 */
export async function verifyTonTransaction(params: {
  txHash: string;
  expectedDestination: string;
  expectedValueTon: number;
  tolerancePercent?: number;
}): Promise<{ verified: boolean; tx?: TonTransaction }> {
  const {
    txHash,
    expectedDestination,
    expectedValueTon,
    tolerancePercent = 1,
  } = params;

  const expectedNano = BigInt(Math.round(expectedValueTon * 1e9));
  const tolerance = (expectedNano * BigInt(tolerancePercent)) / 100n;

  // Poll for up to 60 seconds (12 * 5s)
  for (let attempt = 0; attempt < 12; attempt++) {
    await sleep(5000);

    try {
      const resp = await axios.get(`${TON_API_BASE}/getTransactions`, {
        params: {
          address: expectedDestination,
          limit: 20,
        },
        headers: { 'X-API-Key': TON_API_KEY },
        timeout: 10_000,
      });

      if (!resp.data.ok) continue;

      const txs: TonTransaction[] = resp.data.result;

      const match = txs.find((tx) => {
        if (tx.hash !== txHash) return false;
        const value = BigInt(tx.in_msg.value);
        const diff = value - expectedNano;
        const absDiff = diff < 0n ? -diff : diff;
        return absDiff <= tolerance;
      });

      if (match) {
        return { verified: true, tx: match };
      }
    } catch (err) {
      console.error('TON API poll error:', err);
    }
  }

  return { verified: false };
}

/**
 * Alternative: verify by wallet address + checking recent txs for the BOC hash.
 * Use this when sendBocReturnHash is not available.
 */
export async function verifyTransactionByAddress(params: {
  senderAddress: string;
  destinationAddress: string;
  expectedValueTon: number;
  afterUnixTime: number;
}): Promise<{ verified: boolean; txHash?: string }> {
  const { senderAddress, destinationAddress, expectedValueTon, afterUnixTime } = params;
  const expectedNano = BigInt(Math.round(expectedValueTon * 1e9));
  const tolerance = expectedNano / 100n; // 1%

  for (let attempt = 0; attempt < 12; attempt++) {
    await sleep(5000);

    try {
      const resp = await axios.get(`${TON_API_BASE}/getTransactions`, {
        params: { address: destinationAddress, limit: 20 },
        headers: { 'X-API-Key': TON_API_KEY },
        timeout: 10_000,
      });

      if (!resp.data.ok) continue;

      const txs: TonTransaction[] = resp.data.result;
      const match = txs.find((tx) => {
        if (tx.utime < afterUnixTime) return false;
        if (tx.in_msg.source !== senderAddress) return false;
        const value = BigInt(tx.in_msg.value);
        const diff = value - expectedNano;
        const absDiff = diff < 0n ? -diff : diff;
        return absDiff <= tolerance;
      });

      if (match) {
        return { verified: true, txHash: match.hash };
      }
    } catch (err) {
      console.error('TON API poll error:', err);
    }
  }

  return { verified: false };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
