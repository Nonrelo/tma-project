import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useCallback } from 'react';

const NANO = 1_000_000_000n;

export function useTonConnect() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const connected = !!wallet;
  const address = wallet?.account?.address ?? null;
  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  /**
   * Send a TON payment and return the raw BOC string.
   * The BOC must be sent to the backend for verification.
   */
  const sendPayment = useCallback(
    async (params: {
      amountTon: number;
      payload?: string; // base64 cell payload (optional comment)
    }): Promise<string> => {
      if (!connected) throw new Error('Wallet not connected');

      const nanoAmount = (BigInt(Math.round(params.amountTon * 1e9))).toString();

      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 min
        messages: [
          {
            address: process.env.NEXT_PUBLIC_MERCHANT_WALLET!,
            amount: nanoAmount,
            ...(params.payload && { payload: params.payload }),
          },
        ],
      });

      // result.boc is the signed BOC in base64
      return result.boc;
    },
    [connected, tonConnectUI]
  );

  const disconnect = useCallback(() => {
    tonConnectUI.disconnect();
  }, [tonConnectUI]);

  return { connected, address, shortAddress, wallet, sendPayment, disconnect };
}
