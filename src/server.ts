import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { db } from './db';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = req.cookies?.auth_token;
  if (!process.env.AUTH_SECRET || token !== process.env.AUTH_SECRET) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

app.post('/auth', (req, res) => {
  if (!process.env.AUTH_PASSWORD || !process.env.AUTH_SECRET) {
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const { password } = req.body as { password?: string };

  if (password !== process.env.AUTH_PASSWORD) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  // SameSite=None requires Secure — frontend and backend are on different
  // domains (Vercel / Northflank), so the cookie must always be Secure.
  res.cookie('auth_token', process.env.AUTH_SECRET, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 30,
    path: '/',
  });
  res.json({ ok: true });
});

// Liste des groupes
app.get('/groups', async (_req, res) => {
  try {
    const groups = await db.group.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(
      groups.map((g) => ({
        id: g.id,
        forumId: g.forumId,
        name: g.name,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Membres d’un groupe
app.get('/groups/:id/members', async (req, res) => {
  const { id } = req.params;

  try {
    const group = await db.group.findUnique({ where: { id } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const members = await db.member.findMany({
      where: { groupId: id },
      orderBy: { lastChangeAt: 'desc' },
    });

    res.json(
      members.map((m) => ({
        id: m.id,
        forumId: m.forumId,
        username: m.username,
        lastPoints: m.lastPoints,
        lastScanAt: m.lastScanAt,
        lastChangeAt: m.lastChangeAt,
        profileUrl: m.profileUrl,
        manualStatus: m.manualStatus,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/members/:id/status', requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const { status } = req.body as { status: 'absent' | 'toDelete' | null };

  if (status !== 'absent' && status !== 'toDelete' && status !== null)
    return res.status(400).json({ error: 'Status invalide' });

  const member = await db.member.update({
    where: { id },
    data: {
      manualStatus: status,
    },
  });

  res.json(member);
});

app.get('/members', async (_req, res) => {
  const members = await db.member.findMany({
    include: {
      group: true,
    },
  });

  const payload = members.map((m) => ({
    id: m.id,
    forumId: m.forumId,
    username: m.username,
    lastPoints: m.lastPoints,
    lastScanAt: m.lastScanAt,
    lastChangeAt: m.lastChangeAt,
    manualStatus: m.manualStatus,
    profileUrl: m.profileUrl,
    groupId: m.groupId,
    groupName: m.group.name,
    groupForumId: m.group.forumId,
  }));

  res.json(payload);
});

app.listen(PORT, () => {
  console.log(`API ILH Points watcher listening on port ${PORT}`);
});
