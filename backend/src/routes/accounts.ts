import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireInitData, requireAdmin } from '../middleware/auth';
import { sendBocAndGetHash, verifyTonTransaction } from '../services/ton';

const router = Router();

// GET /accounts — public list
router.get('/', async (_req: Request, res: Response) => {
  const accounts = await prisma.account.findMany({
    where: { quantity: { gt: 0 } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(accounts);
});

// POST /accounts — admin create
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  const { country, countryCode, flag, quantity, price } = req.body;
  if (!country || !countryCode || !flag || quantity == null || price == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const account = await prisma.account.create({
    data: { country, countryCode, flag, quantity: Number(quantity), price: Number(price) },
  });
  res.status(201).json(account);
});

// PUT /accounts/:id — admin update
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { country, countryCode, flag, quantity, price } = req.body;
  try {
    const account = await prisma.account.update({
      where: { id },
      data: {
        ...(country !== undefined && { country }),
        ...(countryCode !== undefined && { countryCode }),
        ...(flag !== undefined && { flag }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(price !== undefined && { price: Number(price) }),
      },
    });
    res.json(account);
  } catch {
    res.status(404).json({ error: 'Account not found' });
  }
});

// DELETE /accounts/:id — admin delete
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await prisma.account.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Account not found' });
  }
});

// POST /accounts/:id/buy — user purchase
router.post('/:id/buy', requireInitData, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = (req as any).telegramUser;
  const { walletAddress, boc } = req.body;

  if (!walletAddress || !boc) {
    return res.status(400).json({ error: 'walletAddress and boc required' });
  }

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account || account.quantity < 1) {
    return res.status(400).json({ error: 'Account not available' });
  }

  // Broadcast BOC and get tx hash
  let txHash: string;
  try {
    txHash = await sendBocAndGetHash(boc);
  } catch (err) {
    return res.status(400).json({ error: 'Failed to broadcast transaction' });
  }

  // Check for duplicate
  const existing = await prisma.order.findUnique({ where: { txHash } });
  if (existing) {
    return res.status(409).json({ error: 'Transaction already processed' });
  }

  // Create order as PENDING
  const order = await prisma.order.create({
    data: {
      accountId: id,
      telegramId: String(user.id),
      walletAddress,
      tonAmount: account.price,
      boc,
      txHash,
      status: 'PENDING',
    },
  });

  // Verify in background
  setImmediate(async () => {
    const { verified } = await verifyTonTransaction({
      txHash,
      expectedDestination: process.env.MERCHANT_WALLET!,
      expectedValueTon: account.price,
    });

    if (verified) {
      await prisma.$transaction([
        prisma.order.update({ where: { id: order.id }, data: { status: 'CONFIRMED' } }),
        prisma.account.update({ where: { id }, data: { quantity: { decrement: 1 } } }),
      ]);
    } else {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    }
  });

  res.json({ orderId: order.id, txHash, status: 'PENDING' });
});

// GET /accounts/orders/:orderId — poll order status
router.get('/orders/:orderId', requireInitData, async (req: Request, res: Response) => {
  const id = Number(req.params.orderId);
  const user = (req as any).telegramUser;
  const order = await prisma.order.findFirst({
    where: { id, telegramId: String(user.id) },
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

export default router;
