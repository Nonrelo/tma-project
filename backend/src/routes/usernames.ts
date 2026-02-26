import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireInitData, requireAdmin } from '../middleware/auth';
import { sendBocAndGetHash, verifyTonTransaction } from '../services/ton';

const router = Router();

// GET /usernames — public list (include availability)
router.get('/', async (_req: Request, res: Response) => {
  const usernames = await prisma.username.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      rentals: {
        where: {
          status: 'CONFIRMED',
          expiresAt: { gt: new Date() },
        },
        select: { period: true, expiresAt: true },
        take: 1,
      },
    },
  });

  const result = usernames.map((u) => ({
    ...u,
    occupied: u.rentals.length > 0,
    currentRental: u.rentals[0] || null,
    rentals: undefined,
  }));

  res.json(result);
});

// POST /usernames — admin create
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  const { username, priceDay, priceWeek, priceMonth } = req.body;
  if (!username || priceDay == null || priceWeek == null || priceMonth == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const un = await prisma.username.create({
      data: {
        username: username.startsWith('@') ? username : `@${username}`,
        priceDay: Number(priceDay),
        priceWeek: Number(priceWeek),
        priceMonth: Number(priceMonth),
      },
    });
    res.status(201).json(un);
  } catch {
    res.status(409).json({ error: 'Username already exists' });
  }
});

// PUT /usernames/:id — admin update
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { username, priceDay, priceWeek, priceMonth } = req.body;
  try {
    const un = await prisma.username.update({
      where: { id },
      data: {
        ...(username !== undefined && { username }),
        ...(priceDay !== undefined && { priceDay: Number(priceDay) }),
        ...(priceWeek !== undefined && { priceWeek: Number(priceWeek) }),
        ...(priceMonth !== undefined && { priceMonth: Number(priceMonth) }),
      },
    });
    res.json(un);
  } catch {
    res.status(404).json({ error: 'Username not found' });
  }
});

// DELETE /usernames/:id — admin delete
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await prisma.username.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Username not found' });
  }
});

// POST /usernames/:id/rent
router.post('/:id/rent', requireInitData, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = (req as any).telegramUser;
  const { walletAddress, boc, period } = req.body;

  if (!walletAddress || !boc || !period) {
    return res.status(400).json({ error: 'walletAddress, boc, and period required' });
  }

  if (!['DAY', 'WEEK', 'MONTH'].includes(period)) {
    return res.status(400).json({ error: 'period must be DAY, WEEK, or MONTH' });
  }

  const unRecord = await prisma.username.findUnique({ where: { id } });
  if (!unRecord) return res.status(404).json({ error: 'Username not found' });

  // Check if currently rented
  const activeRental = await prisma.rental.findFirst({
    where: {
      usernameId: id,
      status: 'CONFIRMED',
      expiresAt: { gt: new Date() },
    },
  });
  if (activeRental) {
    return res.status(409).json({ error: 'Username is currently occupied' });
  }

  const priceMap: Record<string, number> = {
    DAY: unRecord.priceDay,
    WEEK: unRecord.priceWeek,
    MONTH: unRecord.priceMonth,
  };
  const tonAmount = priceMap[period];

  let txHash: string;
  try {
    txHash = await sendBocAndGetHash(boc);
  } catch {
    return res.status(400).json({ error: 'Failed to broadcast transaction' });
  }

  const existing = await prisma.rental.findUnique({ where: { txHash } });
  if (existing) return res.status(409).json({ error: 'Transaction already processed' });

  const rental = await prisma.rental.create({
    data: {
      usernameId: id,
      telegramId: String(user.id),
      walletAddress,
      period: period as any,
      tonAmount,
      boc,
      txHash,
      status: 'PENDING',
    },
  });

  setImmediate(async () => {
    const { verified } = await verifyTonTransaction({
      txHash,
      expectedDestination: process.env.MERCHANT_WALLET!,
      expectedValueTon: tonAmount,
    });

    if (verified) {
      const now = new Date();
      const periodMs: Record<string, number> = {
        DAY: 86400_000,
        WEEK: 604800_000,
        MONTH: 2592000_000,
      };
      const expiresAt = new Date(now.getTime() + periodMs[period]);
      await prisma.rental.update({
        where: { id: rental.id },
        data: { status: 'CONFIRMED', startsAt: now, expiresAt },
      });
    } else {
      await prisma.rental.update({
        where: { id: rental.id },
        data: { status: 'FAILED' },
      });
    }
  });

  res.json({ rentalId: rental.id, txHash, status: 'PENDING' });
});

// GET /usernames/rentals/:rentalId — poll rental status
router.get('/rentals/:rentalId', requireInitData, async (req: Request, res: Response) => {
  const id = Number(req.params.rentalId);
  const user = (req as any).telegramUser;
  const rental = await prisma.rental.findFirst({
    where: { id, telegramId: String(user.id) },
  });
  if (!rental) return res.status(404).json({ error: 'Rental not found' });
  res.json(rental);
});

export default router;
