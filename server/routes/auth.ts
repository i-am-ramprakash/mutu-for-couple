import { Router } from 'express';
import { db } from '../db';
import { addRecord, getRecord } from '../../src/utils/firestore';
import { User } from '../../src/types';

const router = Router();

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
    res.json(user);
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
    res.json(newUser);
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { uid } = req.body;
  try {
    let user = db.users.find(u => u.id === uid);
    if (!user) {
      user = await getRecord<User>('users', uid) || undefined;
      if (user) db.users.push(user);
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
