import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// GET /admin/orders
router.get('/orders', requireAdmin, async (_req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    include: { account: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

// GET /admin/rentals
router.get('/rentals', requireAdmin, async (_req: Request, res: Response) => {
  const rentals = await prisma.rental.findMany({
    include: { username: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rentals);
});

// GET /admin/stats
router.get('/stats', requireAdmin, async (_req: Request, res: Response) => {
  const [totalOrders, confirmedOrders, totalRentals, confirmedRentals] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'CONFIRMED' } }),
    prisma.rental.count(),
    prisma.rental.count({ where: { status: 'CONFIRMED' } }),
  ]);

  const revenueOrders = await prisma.order.aggregate({
    _sum: { tonAmount: true },
    where: { status: 'CONFIRMED' },
  });
  const revenueRentals = await prisma.rental.aggregate({
    _sum: { tonAmount: true },
    where: { status: 'CONFIRMED' },
  });

  res.json({
    orders: { total: totalOrders, confirmed: confirmedOrders },
    rentals: { total: totalRentals, confirmed: confirmedRentals },
    revenue: {
      ton:
        (revenueOrders._sum.tonAmount || 0) + (revenueRentals._sum.tonAmount || 0),
    },
  });
});

// POST /admin/admins — add admin by telegram ID
router.post('/admins', requireAdmin, async (req: Request, res: Response) => {
  const { telegramId } = req.body;
  if (!telegramId) return res.status(400).json({ error: 'telegramId required' });
  try {
    const admin = await prisma.admin.create({ data: { telegramId: String(telegramId) } });
    res.status(201).json(admin);
  } catch {
    res.status(409).json({ error: 'Admin already exists' });
  }
});

export default router;
