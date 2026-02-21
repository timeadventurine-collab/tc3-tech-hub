/**
 * ============================================================
 *  TC3 TECH-HUB 11A1 — BACKEND SERVER (server.js)
 *  Stack: Node.js + Express + Firebase Admin SDK + Socket.io
 *  Author: TC3 TECH-HUB
 * ============================================================
 */

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const admin      = require('firebase-admin');
const cors       = require('cors');
const bodyParser = require('body-parser');

// ─── FIREBASE INIT ───────────────────────────────────────────
// Replace the serviceAccount object with your own Firebase Admin credentials
// Download from: Firebase Console → Project Settings → Service Accounts → Generate new private key
const serviceAccount = require('./serviceAccountKey.json');  // <-- place your key here

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // If using Realtime Database, add:
  // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com"
});

const db = admin.firestore();

// ─── EXPRESS + SOCKET.IO SETUP ───────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(express.static('public')); // serve frontend from /public folder

// ─── CONSTANTS ───────────────────────────────────────────────
const MAX_TIMELINE   = 50;   // auto-purge threshold
const MAX_CHAT_MSGS  = 50;   // keep last N messages
const TIMELINE_INTERVAL_MS = 10_000; // broadcast every 10s

// ─── UTILITY ─────────────────────────────────────────────────

/** Add points to a user's leaderboard score */
async function addPoints(userId, username, avatar, delta) {
  const ref = db.collection('leaderboard').doc(userId);
  const doc = await ref.get();
  if (doc.exists) {
    await ref.update({
      points: admin.firestore.FieldValue.increment(delta),
      username,
      avatar: avatar || ''
    });
  } else {
    await ref.set({ userId, username, avatar: avatar || '', points: delta, month: getCurrentMonth() });
  }
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Push a timeline activity record; auto-purge if > MAX_TIMELINE */
async function pushTimeline(action) {
  const col = db.collection('timeline');
  const snap = await col.orderBy('createdAt', 'desc').limit(1).get();
  const count = (await col.count().get()).data().count;

  if (count >= MAX_TIMELINE) {
    // Purge all old records
    const old = await col.get();
    const batch = db.batch();
    old.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  const newDoc = await col.add({
    ...action,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Emit realtime
  const saved = (await newDoc.get()).data();
  io.emit('timeline:new', { id: newDoc.id, ...saved });
}

// ─── MIDDLEWARE: simple auth check ───────────────────────────
// Expects header: Authorization: Bearer <Firebase ID Token>
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─────────────────────────────────────────────────────────────
//  I. Q&A FORUM APIs
// ─────────────────────────────────────────────────────────────

/** POST /api/posts — Create a new Q&A post */
app.post('/api/posts', requireAuth, async (req, res) => {
  try {
    const { title, content, tags = [], imageURL = '', codeSnippet = '' } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });

    const post = await db.collection('posts').add({
      title,
      content,
      tags,
      imageURL,
      codeSnippet,
      authorId:   req.user.uid,
      authorName: req.user.name || 'Thành viên',
      avatar:     req.user.picture || '',
      likes:      0,
      comments:   0,
      createdAt:  admin.firestore.FieldValue.serverTimestamp()
    });

    await addPoints(req.user.uid, req.user.name, req.user.picture, 5);
    await pushTimeline({
      type:       'post',
      userId:     req.user.uid,
      userName:   req.user.name || 'Thành viên',
      avatar:     req.user.picture || '',
      message:    `đã đăng bài: "${title}"`,
      postId:     post.id
    });

    res.json({ id: post.id, ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/posts — List posts with pagination & optional tag filter */
app.get('/api/posts', async (req, res) => {
  try {
    const { tag, lastId, limit = 10 } = req.query;
    let query = db.collection('posts').orderBy('createdAt', 'desc').limit(Number(limit));

    if (tag) query = query.where('tags', 'array-contains', tag);

    if (lastId) {
      const lastDoc = await db.collection('posts').doc(lastId).get();
      if (lastDoc.exists) query = query.startAfter(lastDoc);
    }

    const snap  = await query.get();
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }));
    res.json({ posts, nextId: posts.length === Number(limit) ? posts[posts.length - 1].id : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/posts/:id — Single post with comments */
app.get('/api/posts/:id', async (req, res) => {
  try {
    const doc = await db.collection('posts').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const comments = await db.collection('posts').doc(req.params.id)
      .collection('comments').orderBy('createdAt', 'asc').get();

    res.json({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate(),
      comments: comments.docs.map(c => ({ id: c.id, ...c.data(), createdAt: c.data().createdAt?.toDate() }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/posts/:id/comments — Add a comment */
app.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const comment = await db.collection('posts').doc(req.params.id)
      .collection('comments').add({
        content,
        authorId:   req.user.uid,
        authorName: req.user.name || 'Thành viên',
        avatar:     req.user.picture || '',
        likes:      0,
        createdAt:  admin.firestore.FieldValue.serverTimestamp()
      });

    // Increment comment count on post
    await db.collection('posts').doc(req.params.id).update({
      comments: admin.firestore.FieldValue.increment(1)
    });

    await addPoints(req.user.uid, req.user.name, req.user.picture, 2);

    // Emit realtime to everyone viewing this post
    io.emit(`post:${req.params.id}:comment`, { id: comment.id, content, authorName: req.user.name });

    res.json({ id: comment.id, ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/posts/:id/comments/:cid/like — Upvote a comment */
app.post('/api/posts/:id/comments/:cid/like', requireAuth, async (req, res) => {
  try {
    const ref = db.collection('posts').doc(req.params.id)
      .collection('comments').doc(req.params.cid);

    await ref.update({ likes: admin.firestore.FieldValue.increment(1) });

    // Award +1 to post author (get post first)
    const post = await db.collection('posts').doc(req.params.id).get();
    if (post.exists) {
      const { authorId, authorName, avatar } = post.data();
      await addPoints(authorId, authorName, avatar, 1);
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/posts/:id/like — Like a post */
app.post('/api/posts/:id/like', requireAuth, async (req, res) => {
  try {
    await db.collection('posts').doc(req.params.id).update({
      likes: admin.firestore.FieldValue.increment(1)
    });
    const post = await db.collection('posts').doc(req.params.id).get();
    if (post.exists) {
      await addPoints(post.data().authorId, post.data().authorName, post.data().avatar, 1);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  II. ACTIVITY NEWSFEED APIs
// ─────────────────────────────────────────────────────────────

/** GET /api/timeline — Last 20 timeline records */
app.get('/api/timeline', async (req, res) => {
  try {
    const snap = await db.collection('timeline')
      .orderBy('createdAt', 'desc').limit(20).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  III. PROJECT INTERACTION APIs
// ─────────────────────────────────────────────────────────────

/** POST /api/projects/:id/like — Like a project */
app.post('/api/projects/:id/like', requireAuth, async (req, res) => {
  try {
    await db.collection('projects').doc(req.params.id).update({
      likes: admin.firestore.FieldValue.increment(1)
    });
    io.emit('project:liked', { projectId: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/projects/:id/rate — Rate 1-5 stars */
app.post('/api/projects/:id/rate', requireAuth, async (req, res) => {
  try {
    const { stars } = req.body;
    if (!stars || stars < 1 || stars > 5) return res.status(400).json({ error: 'stars must be 1-5' });

    const ratingRef = db.collection('projects').doc(req.params.id)
      .collection('ratings').doc(req.user.uid);
    await ratingRef.set({ stars, userId: req.user.uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    // Recalculate avg rating
    const ratingsSnap = await db.collection('projects').doc(req.params.id).collection('ratings').get();
    let total = 0;
    ratingsSnap.forEach(d => total += d.data().stars);
    const avg = total / ratingsSnap.size;

    await db.collection('projects').doc(req.params.id).update({
      avgRating: avg, ratingCount: ratingsSnap.size
    });

    res.json({ ok: true, avg: avg.toFixed(1) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/projects/:id/share — Share project to community feed */
app.post('/api/projects/:id/share', requireAuth, async (req, res) => {
  try {
    const proj = await db.collection('projects').doc(req.params.id).get();
    if (!proj.exists) return res.status(404).json({ error: 'Project not found' });

    const { name, desc, image } = proj.data();

    // Create a community post linking the project
    const post = await db.collection('posts').add({
      title:      `[Chia sẻ Dự Án] ${name}`,
      content:    desc || 'Dự án được chia sẻ từ TC3 TECH-HUB',
      tags:       ['project', 'share'],
      imageURL:   image || '',
      codeSnippet: '',
      projectId:  req.params.id,
      authorId:   req.user.uid,
      authorName: req.user.name || 'Thành viên',
      avatar:     req.user.picture || '',
      likes:      0,
      comments:   0,
      createdAt:  admin.firestore.FieldValue.serverTimestamp()
    });

    await pushTimeline({
      type:     'share',
      userId:   req.user.uid,
      userName: req.user.name || 'Thành viên',
      avatar:   req.user.picture || '',
      message:  `đã chia sẻ dự án: "${name}"`,
      postId:   post.id
    });

    io.emit('post:new', { id: post.id });

    res.json({ ok: true, postId: post.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  IV. LEADERBOARD APIs
// ─────────────────────────────────────────────────────────────

/** GET /api/leaderboard — Top 5 this month */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonth();
    const snap  = await db.collection('leaderboard')
      .where('month', '==', month)
      .orderBy('points', 'desc')
      .limit(5)
      .get();
    const top = snap.docs.map((d, i) => ({ rank: i + 1, id: d.id, ...d.data() }));
    res.json({ month, top });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  V. SOCKET.IO — LIVE CHAT + REALTIME
// ─────────────────────────────────────────────────────────────

// In-memory last 50 messages (also synced to Firestore)
let chatHistory = [];

io.on('connection', async (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  // Send last 50 chat messages on connect
  socket.emit('chat:history', chatHistory);

  // Receive a new chat message
  socket.on('chat:send', async (msg) => {
    if (!msg.text || !msg.userName) return;

    const record = {
      id:       Date.now().toString(),
      text:     msg.text.slice(0, 500),    // cap length
      userName: msg.userName,
      avatar:   msg.avatar || '',
      userId:   msg.userId || '',
      ts:       new Date().toISOString()
    };

    chatHistory.push(record);
    if (chatHistory.length > MAX_CHAT_MSGS) chatHistory.shift();

    // Persist to Firestore (async, non-blocking)
    db.collection('chat').doc(record.id).set(record).catch(() => {});

    // Broadcast to all clients
    io.emit('chat:message', record);
  });

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

// Load existing chat history from Firestore on startup
async function loadChatHistory() {
  try {
    const snap = await db.collection('chat')
      .orderBy('ts', 'desc').limit(MAX_CHAT_MSGS).get();
    chatHistory = snap.docs.map(d => d.data()).reverse();
    console.log(`[chat] Loaded ${chatHistory.length} messages from Firestore`);
  } catch (e) {
    console.warn('[chat] Could not load history:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────
//  VI. PERIODIC TIMELINE BROADCAST (every 10s)
// ─────────────────────────────────────────────────────────────
setInterval(async () => {
  try {
    const snap = await db.collection('timeline')
      .orderBy('createdAt', 'desc').limit(5).get();
    if (!snap.empty) {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }));
      io.emit('timeline:batch', items);
    }
  } catch (e) { /* silent */ }
}, TIMELINE_INTERVAL_MS);

// ─────────────────────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

server.listen(PORT, async () => {
  await loadChatHistory();
  console.log(`✅ TC3 TECH-HUB Backend running at http://localhost:${PORT}`);
});
