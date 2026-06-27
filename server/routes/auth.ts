import { Router } from 'express';
import { db } from '../db';
import { addRecord, getRecord } from '../../src/utils/firestore';
import { User } from '../../src/types';

const router = Router();

export function populatePartnerFields(user: User): any {
  if (!user) return user;
  const couple = user.coupleId ? db.couples.find(c => c.id === user.coupleId) : null;
  const anniversaryDate = couple?.anniversaryDate || user.anniversaryDate || '';
  const partner = user.partnerId ? db.users.find(u => u.id === user.partnerId) : null;
  const baseUser = {
    ...user,
    anniversaryDate
  };
  if (partner) {
    return {
      ...baseUser,
      partnerName: partner.name || '',
      partnerPhoto: partner.profilePhoto || '🧡',
      partnerCity: partner.locationCity || '',
      partnerWeather: partner.locationWeather || '',
      partnerTimezone: partner.locationTimezone || '0',
      partnerMood: partner.checkInMood || '',
      partnerLoveLanguage: partner.checkInLoveLanguage || '',
      partnerSleepMode: partner.isSleepMode || false,
      partnerOnline: partner.online || false,
      partnerLastActiveTime: partner.lastActiveTime || 0,
      partnerPresenceStatus: partner.currentPresenceStatus || '',
      partnerHeartbeat: partner.lastActiveTime || 0,
      partnerBirthday: partner.birthday || ''
    };
  }
  return baseUser;
}

router.post('/google', async (req, res) => {
  const { uid, name, email, profilePhoto } = req.body;
  try {
    let user = db.users.find(u => u.id === uid);
    if (!user) {
      user = await getRecord<User>('users', uid) || undefined;
      if (user) db.users.push(user);
    }

    if (!user) {
      const newUser: User = {
        id: uid,
        name: name || 'Google User',
        email: email || '',
        profilePhoto: profilePhoto || '',
        birthday: '',
        online: false
      };
      await addRecord('users', newUser);
      db.users.push(newUser);
      user = newUser;
    }
    res.json(populatePartnerFields(user));
  } catch (err) {
    res.status(500).json({ error: 'Auth failed' });
  }
});

router.post('/register', async (req, res) => {
  const { uid, name, email, birthday, profilePhoto } = req.body;
  try {
    const newUser: User = {
      id: uid,
      name,
      email,
      birthday,
      profilePhoto: profilePhoto || '💖',
      online: false
    };
    await addRecord('users', newUser);
    db.users.push(newUser);
    res.json(populatePartnerFields(newUser));
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { uid, email } = req.body;
  try {
    let user: User | undefined = undefined;
    
    // Try to find by uid first if provided
    if (uid) {
      user = db.users.find(u => u.id === uid);
      if (!user) {
        user = await getRecord<User>('users', uid) || undefined;
        if (user) {
          db.users.push(user);
        }
      }
    }

    // Fallback to searching by email if user not found or uid wasn't provided
    if (!user && email) {
      user = db.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      if (!uid) {
        return res.status(400).json({ error: 'User ID is required for login/registration fallback' });
      }

      console.log(`[Login] User ${uid} not found in Supabase. Creating fallback user profile.`);
      const newUser: User = {
        id: uid,
        name: email ? email.split('@')[0] : 'User',
        email: email || '',
        profilePhoto: '💖',
        birthday: '',
        online: false
      };
      await addRecord('users', newUser);
      db.users.push(newUser);
      user = newUser;
    }
    res.json(populatePartnerFields(user));
  } catch (err) {
    console.error('[Login Route Error]:', err);
    res.status(500).json({ error: `Login failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

export default router;
