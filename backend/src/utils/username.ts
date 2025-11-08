import type { Prisma, PrismaClient } from '@prisma/client';

const sanitize = (value: string): string => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (cleaned.length === 0) {
    return 'member';
  }

  return cleaned.slice(0, 30);
};

export const generateUniqueUsername = async (
  client: PrismaClient | Prisma.TransactionClient,
  options: {
    email: string;
    firstName?: string | null;
  },
): Promise<string> => {
  const { email, firstName } = options;
  const emailPrefix = email.split('@')[0] ?? 'member';
  const candidates = [firstName, emailPrefix, 'member'];

  const base = sanitize(candidates.find((value) => value && value.trim().length > 0) ?? 'member');

  let attempt = 0;

  // Loop safeguards to avoid infinite loop in extreme collisions
  while (attempt < 50) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const username = `${base}${suffix}`;
    const existing = await client.user.findUnique({ where: { username } });

    if (!existing) {
      return username;
    }

    attempt += 1;
  }

  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${randomSuffix}`;
};
