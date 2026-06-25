import { Router } from 'express';
import { db, saveDB } from '../db';
import { addRecord, updateRecord, deleteRecord } from '../../src/utils/firestore';

const router = Router();

// Messages
router.get('/messages', (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });
  const msgs = db.messages.filter(m => m.coupleId === coupleId);
  res.json(msgs);
});

// Memories
router.get('/memories', (req, res) => {
  const { coupleId } = req.query;
  const items = db.memories.filter(m => m.coupleId === coupleId);
  res.json(items);
});

router.post('/memories', async (req, res) => {
  const memory = req.body;
  try {
    await addRecord('memories', memory);
    db.memories.push(memory);
    res.json(memory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save memory' });
  }
});

// Calendar
router.get('/calendar', (req, res) => {
  const { coupleId } = req.query;
  const items = db.calendarEvents.filter(e => e.coupleId === coupleId);
  res.json(items);
});

router.post('/calendar', async (req, res) => {
  const event = req.body;
  try {
    await addRecord('calendarEvents', event);
    db.calendarEvents.push(event);
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save event' });
  }
});

// Bucket List
router.get('/bucket-list', (req, res) => {
  const { coupleId } = req.query;
  const items = (db.bucketList || []).filter(b => b.coupleId === coupleId);
  res.json(items);
});

router.post('/bucket-list', async (req, res) => {
  const item = req.body;
  try {
    await addRecord('bucketItems', item);
    if (!db.bucketList) db.bucketList = [];
    db.bucketList.push(item);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save bucket item' });
  }
});

router.post('/bucket-list/toggle', async (req, res) => {
  const { id } = req.body;
  const item = (db.bucketList || []).find(b => b.id === id);
  if (item) {
    item.completed = !item.completed;
    await updateRecord('bucketItems', item);
    res.json(item);
  } else {
    res.status(404).json({ error: 'Item not found' });
  }
});

// Journal
router.get('/journal', (req, res) => {
  const { coupleId } = req.query;
  const items = db.journalEntries.filter(j => j.coupleId === coupleId);
  res.json(items);
});

router.post('/journal', async (req, res) => {
  const entry = req.body;
  try {
    await addRecord('journalEntries', entry);
    db.journalEntries.push(entry);
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save journal entry' });
  }
});

// Locked Letters
router.get('/locked-letters', (req, res) => {
  const { coupleId } = req.query;
  const items = db.lockedLetters.filter(l => l.coupleId === coupleId);
  res.json(items);
});

router.post('/locked-letters', async (req, res) => {
  const letter = req.body;
  try {
    await addRecord('lockedLetters', letter);
    db.lockedLetters.push(letter);
    res.json(letter);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save letter' });
  }
});

router.post('/locked-letters/open', async (req, res) => {
  const { id } = req.body;
  const letter = db.lockedLetters.find(l => l.id === id);
  if (letter) {
    letter.isOpened = true;
    letter.openedAt = Date.now();
    await updateRecord('lockedLetters', letter);
    res.json(letter);
  } else {
    res.status(404).json({ error: 'Letter not found' });
  }
});

// Daily Questions & Answers
router.get('/daily-question', (req, res) => {
  const now = new Date();
  const index = (now.getFullYear() + now.getMonth() + now.getDate()) % 10;
  const { dailyQuestions } = require('../db');
  res.json(dailyQuestions[index]);
});

router.get('/daily-answers', (req, res) => {
  const { coupleId, questionId } = req.query;
  const items = db.dailyAnswers.filter(a => a.coupleId === coupleId && a.questionId === questionId);
  res.json(items);
});

router.post('/daily-answers', async (req, res) => {
  const answer = req.body;
  try {
    await addRecord('dailyAnswers', answer);
    db.dailyAnswers.push(answer);
    res.json(answer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save answer' });
  }
});

// Stats
router.get('/stats', (req, res) => {
  const { coupleId } = req.query;
  const messagesCount = db.messages.filter(m => m.coupleId === coupleId).length;
  const memoriesCount = db.memories.filter(m => m.coupleId === coupleId).length;
  const journalCount = db.journalEntries.filter(j => j.coupleId === coupleId).length;
  const answerCount = db.dailyAnswers.filter(a => a.coupleId === coupleId).length;
  res.json({ messagesCount, memoriesCount, journalCount, answerCount });
});

export default router;
