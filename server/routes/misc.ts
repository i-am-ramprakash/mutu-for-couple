import { Router } from 'express';
import { db, saveDB } from '../db';
import { updateRecord, deleteRecord, addRecord } from '../../src/utils/firestore';

const router = Router();

router.get('/metered/turn', async (req, res) => {
  const domain = process.env.METERED_DOMAIN || 'mutu.metered.ca';
  const apiKey = process.env.METERED_SECRET_KEY || 'sk_secret_ffeb92ae73cd8668dff2a2609b6a25b9183448a6562837edca95a86c8744f912';
  try {
    const response = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch TURN credentials' });
  }
});

router.get('/user/security-logs', (req, res) => {
  const { userId } = req.query;
  const logs = (db.securityLogs || []).filter(l => l.userId === userId);
  res.json(logs);
});

router.get('/user/export-data', (req, res) => {
  const { userId } = req.query;
  const userData = {
    user: db.users.find(u => u.id === userId),
    messages: db.messages.filter(m => m.senderId === userId),
    memories: db.memories.filter(m => m.userId === userId)
  };
  res.json(userData);
});

router.post('/user/delete-account', async (req, res) => {
  const { userId } = req.body;
  try {
    await deleteRecord('users', userId);
    db.users = db.users.filter(u => u.id !== userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

router.get('/user/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const user = db.users.find(u => u.id === userId);
  if (user) res.json({ success: true, user });
  else res.status(404).json({ error: 'User not found' });
});

router.post('/bucket-list/delete', async (req, res) => {
  const { id } = req.body;
  try {
    await deleteRecord('bucketItems', id);
    if (db.bucketList) db.bucketList = db.bucketList.filter(b => b.id !== id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bucket item' });
  }
});

router.get('/movies', (req, res) => {
  res.json(db.movies || []);
});

router.get('/movies/history', (req, res) => {
  const { coupleId } = req.query;
  const history = (db.moviesHistory || []).filter(h => h.coupleId === coupleId);
  res.json(history);
});

router.post('/movies/history', async (req, res) => {
  const entry = req.body;
  try {
    await addRecord('moviesHistory', entry);
    if (!db.moviesHistory) db.moviesHistory = [];
    db.moviesHistory.push(entry);
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save movie history' });
  }
});

router.post('/user/presence', async (req, res) => {
  const { userId, online, lastSeen } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.online = online;
    user.lastSeen = lastSeen;
    await updateRecord('users', user);
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

router.get('/couple/timeline', (req, res) => {
  const { coupleId } = req.query;
  const items = (db.timelineEvents || []).filter(t => t.coupleId === coupleId);
  res.json(items);
});

router.post('/couple/timeline', async (req, res) => {
  const event = req.body;
  try {
    await addRecord('timelineEvents', event);
    if (!db.timelineEvents) db.timelineEvents = [];
    db.timelineEvents.push(event);
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save timeline event' });
  }
});

router.get('/couple/music', (req, res) => {
  const { coupleId } = req.query;
  const items = (db.sharedTracks || []).filter(m => m.coupleId === coupleId);
  res.json(items);
});

router.post('/couple/music/add', async (req, res) => {
  const track = req.body;
  try {
    await addRecord('sharedTracks', track);
    if (!db.sharedTracks) db.sharedTracks = [];
    db.sharedTracks.push(track);
    res.json(track);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add music' });
  }
});

export default router;
