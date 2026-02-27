import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
}

export function parseInitData(initData: string): { user?: TelegramUser } | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN!)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    console.log('computed:', computedHash);
    console.log('received:', hash);
    console.log('match:', computedHash === hash);

    if (computedHash !== hash) return null;

    const userRaw = params.get('user');
    const user: TelegramUser | undefined = userRaw ? JSON.parse(userRaw) : undefined;
    return { user };
  } catch (e) {
    console.log('parseInitData error:', e);
    return null;
  }
}

export function requireInitData(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  console.log('auth header:', authHeader?.slice(0, 50));
  
  if (!authHeader?.startsWith('tma ')) {
    return res.status(401).json({ error: 'Missing Telegram auth' });
  }
  
  const initData = decodeURIComponent(authHeader.slice(4));
  console.log('initData slice:', initData.slice(0, 100));
  
  const parsed = parseInitData(initData);
  console.log('parsed:', parsed);
  
  if (!parsed?.user) {
    return res.status(401).json({ error: 'Invalid initData' });
  }
  
  (req as any).telegramUser = parsed.user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireInitData(req, res, async () => {
    const user: TelegramUser = (req as any).telegramUser;
    console.log('checking admin for:', user?.id);
    
    const { prisma } = await import('../db');
    const admin = await prisma.admin.findUnique({ 
      where: { telegramId: String(user.id) } 
    });
    
    console.log('admin found:', admin);
    
    if (!admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
}
