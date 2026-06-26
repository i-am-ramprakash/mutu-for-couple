import { Router } from 'express';
import { db } from '../db';
import { addRecord, updateRecord, getRecord } from '../../src/utils/firestore';
import { Couple, User } from '../../src/types';

const router = Router();

router.post('/generate-invite', async (req, res) => {
  const { userId, anniversaryDate } = req.body;
  try {
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate unique code LOVE-XXXX-XXXX
    const code = 'LOVE-' + Math.random().toString(36).substr(2, 4).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    const newCouple: Couple = {
      id: `couple_${Date.now()}`,
      inviteCode: code,
      partner1Id: userId,
      loveKey: Math.random().toString(36).substr(2, 10).toUpperCase(),
      anniversaryDate,
      createdAt: Date.now()
    };

    await addRecord('couples', newCouple);
    db.couples.push(newCouple);

    user.inviteCode = code;
    user.coupleId = newCouple.id;
    await updateRecord('users', user);

    res.json({ success: true, couple: newCouple, user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate invite' });
  }
});

router.post('/join', async (req, res) => {
  const { userId, inviteCode } = req.body;
  try {
    const couple = db.couples.find(c => c.inviteCode === inviteCode);
    if (!couple) return res.status(404).json({ error: 'Invalid invite code' });
    if (couple.partner2Id) return res.status(400).json({ error: 'This couple is already full' });
    if (couple.partner1Id === userId) return res.status(400).json({ error: 'You cannot join your own invite' });

    couple.partner2Id = userId;
    await updateRecord('couples', couple);

    let user = db.users.find(u => u.id === userId);
    if (!user) {
      user = await getRecord<User>('users', userId) || undefined;
      if (user) db.users.push(user);
    }
    if (user) {
      user.coupleId = couple.id;
      user.partnerId = couple.partner1Id;
      await updateRecord('users', user);
    }

    let partner1 = db.users.find(u => u.id === couple.partner1Id);
    if (!partner1) {
      partner1 = await getRecord<User>('users', couple.partner1Id) || undefined;
      if (partner1) db.users.push(partner1);
    }
    if (partner1) {
      partner1.partnerId = userId;
      await updateRecord('users', partner1);
    }

    res.json({ success: true, couple, user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join couple' });
  }
});

router.post('/update-profile', async (req, res) => {
  const { userId, ...updates } = req.body;
  try {
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    Object.assign(user, updates);
    await updateRecord('users', user);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/update-anniversary', async (req, res) => {
  const { coupleId, anniversaryDate } = req.body;
  try {
    const couple = db.couples.find(c => c.id === coupleId);
    if (!couple) return res.status(404).json({ error: 'Couple not found' });
    couple.anniversaryDate = anniversaryDate;
    await updateRecord('couples', couple);
    res.json(couple);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update anniversary' });
  }
});

router.post('/update-settings', async (req, res) => {
  const { coupleId, settings } = req.body;
  try {
    const couple = db.couples.find(c => c.id === coupleId);
    if (!couple) return res.status(404).json({ error: 'Couple not found' });
    couple.settings = { ...(couple.settings || {}), ...settings };
    await updateRecord('couples', couple);
    res.json(couple);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
