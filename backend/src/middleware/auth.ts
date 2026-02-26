import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramInitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
}

/**
 * Parse and validate Telegram WebApp initData
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function parseInitData(initData: string): TelegramInitData | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    // Sort params alphabetically and build data-check-string
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

    if (computedHash !== hash) return null;

    // Check auth_date is not too old (max 1 hour)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (Date.now() / 1000 - authDate > 3600) return null;

    const userRaw = params.get('user');
    const user: TelegramUser | undefined = userRaw ? JSON.parse(userRaw) : undefined;

    return {
      query_id: params.get('query_id') || undefined,
      user,
      auth_date: authDate,
      hash,
    };
  } catch {
    return null;
  }
}

/** Middleware: require valid Telegram initData in Authorization header */
export function requireInitData(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('tma ')) {
    return res.status(401).json({ error: 'Missing Telegram auth' });
  }

  const initData = decodeURIComponent(authHeader.slice(4));
  const parsed = parseInitData(initData);
  if (!parsed || !parsed.user) {
    return res.status(401).json({ error: 'Invalid Telegram initData' });
  }

  (req as any).telegramUser = parsed.user;
  next();
}

/** Middleware: require the user to be an admin */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireInitData(req, res, async () => {
    const user: TelegramUser = (req as any).telegramUser;
    const { prisma } = await import('../db');
    const admin = await prisma.admin.findUnique({
      where: { telegramId: String(user.id) },
    });
    if (!admin) {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }
    next();
  });
}
