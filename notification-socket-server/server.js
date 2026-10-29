const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;

// Configure CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Gateway-Secret']
}));
app.use(express.json());

// Configure Socket.IO Server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 15000
});

// In-memory notifications store
let notifications = [];

/**
 * Determines whether a notification is visible to the given user or admin role.
 * Rule:
 * 1. Admin gets all notifications for all customer activities.
 * 2. If broadcast is true and no targets specified, all users receive it.
 * 3. If targetUserId is set, only that specific customer receives it (plus admin).
 * 4. If targetUserIds is set, only those specific registered customers receive it (plus admin).
 */
function isVisibleTo(notification, userId, role, email) {
  const normRole = (role || '').toUpperCase();
  // Admins see EVERYTHING: "admin need to get all notification for all customer activity"
  if (normRole === 'ADMIN') {
    return true;
  }

  // Explicit broadcast with no restricted targets
  if (notification.broadcast && !notification.targetUserId && (!notification.targetUserIds || notification.targetUserIds.length === 0)) {
    return true;
  }

  // Targeted to single customer or multiple customers (supports matching by userId or email)
  const normUserId = userId ? String(userId) : null;
  const normEmail = email ? String(email) : null;

  if (normUserId || normEmail) {
    if (notification.targetUserId) {
      const target = String(notification.targetUserId);
      if (target === normUserId || target === normEmail) {
        return true;
      }
    }
    if (Array.isArray(notification.targetUserIds)) {
      if (notification.targetUserIds.some(id => String(id) === normUserId || String(id) === normEmail)) {
        return true;
      }
    }
  }

  return false;
}

function isReadByUser(notification, userId, role, email) {
  if (!notification.readBy) {
    notification.readBy = [];
  }
  const normRole = (role || '').toUpperCase();
  if (normRole === 'ADMIN') {
    return notification.readBy.includes('admin');
  }

  const normUserId = userId ? String(userId) : null;
  const normEmail = email ? String(email) : null;

  const isExplicitlyRead = (normUserId && notification.readBy.includes(normUserId)) ||
    (normEmail && notification.readBy.includes(normEmail));

  const isTargetMatch = notification.read && notification.targetUserId &&
    (String(notification.targetUserId) === normUserId || String(notification.targetUserId) === normEmail);

  return Boolean(isExplicitlyRead || isTargetMatch);
}

function getNotificationsFor(userId, role, email) {
  return notifications
    .filter(n => isVisibleTo(n, userId, role, email))
    .map(n => ({
      ...n,
      read: isReadByUser(n, userId, role, email)
    }));
}

function getUnreadCountFor(userId, role, email) {
  return getNotificationsFor(userId, role, email).filter(n => !n.read).length;
}

// ── REST API Endpoints ────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    connectedClients: io.engine.clientsCount,
    totalNotifications: notifications.length,
    unreadCount: notifications.filter(n => !n.read).length
  });
});

// GET notifications filtered by recipient userId and/or role
app.get('/api/notifications', (req, res) => {
  const userId = (req.query.userId || req.headers['x-user-id']) ? String(req.query.userId || req.headers['x-user-id']) : null;
  const role = (req.query.role || req.headers['x-user-role']) ? String(req.query.role || req.headers['x-user-role']) : null;
  const email = (req.query.email || req.headers['x-user-email']) ? String(req.query.email || req.headers['x-user-email']) : null;

  const userNotifs = getNotificationsFor(userId, role, email);
  const unreadCount = getUnreadCountFor(userId, role, email);

  res.json({
    notifications: userNotifs,
    unreadCount
  });
});

// POST new notification
app.post('/api/notify', (req, res) => {
  const {
    id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    type = 'SYSTEM_ALERT',
    category = 'BOOKING',
    title = 'System Notification',
    message = '',
    referenceId = '',
    link = '/admin',
    metadata = {},
    targetUserId = null,
    targetUserIds = null,
    broadcast = false
  } = req.body;

  const newNotification = {
    id,
    type,
    category: category.toUpperCase(),
    title,
    message,
    referenceId,
    link,
    metadata,
    targetUserId: targetUserId ? String(targetUserId) : null,
    targetUserIds: Array.isArray(targetUserIds) ? targetUserIds.map(String) : null,
    broadcast: Boolean(broadcast),
    read: false,
    readBy: [],
    createdAt: new Date().toISOString()
  };

  // Add to top of list and cap history at 200 items
  notifications.unshift(newNotification);
  if (notifications.length > 200) {
    notifications = notifications.slice(0, 200);
  }

  // 1. Deliver to Admin room: "admin need to get all notification for all customer activity"
  const adminUnread = getUnreadCountFor(null, 'ADMIN', null);
  io.to('admin').emit('notification', { ...newNotification, read: false });
  io.to('admin').emit('unread_count', adminUnread);

  // 2. Deliver to targeted customer room(s)
  const targetedRooms = new Set();
  if (newNotification.targetUserId) {
    targetedRooms.add(`user:${newNotification.targetUserId}`);
  }
  if (Array.isArray(newNotification.targetUserIds)) {
    newNotification.targetUserIds.forEach(uid => targetedRooms.add(`user:${uid}`));
  }

  if (targetedRooms.size > 0) {
    for (const room of targetedRooms) {
      const uid = room.replace('user:', '');
      const userUnread = getUnreadCountFor(uid, 'CUSTOMER', uid);
      io.to(room).emit('notification', { ...newNotification, read: false });
      io.to(room).emit('unread_count', userUnread);
    }
  } else if (newNotification.broadcast) {
    // Deliver to everyone if explicitly broadcast
    io.emit('notification', { ...newNotification, read: false });
    io.sockets.sockets.forEach((s) => {
      const sUserId = s.data?.userId;
      const sRole = s.data?.role;
      const sEmail = s.data?.email;
      s.emit('unread_count', getUnreadCountFor(sUserId, sRole, sEmail));
    });
  }

  console.log(`[Socket.IO Notify] Emitted '${type}': "${title}" -> Target: ${targetUserId || (targetUserIds ? targetUserIds.join(',') : 'BROADCAST/ADMIN')}`);

  res.status(201).json({
    success: true,
    notification: newNotification,
    adminUnread
  });
});

// PATCH mark notification as read
app.patch('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const userId = (req.body?.userId || req.query?.userId) ? String(req.body.userId || req.query.userId) : null;
  const role = (req.body?.role || req.query?.role) ? String(req.body.role || req.query.role) : null;
  const email = (req.body?.email || req.query?.email) ? String(req.body.email || req.query.email) : null;

  const notif = notifications.find(n => n.id === id);
  if (notif) {
    if (!notif.readBy) notif.readBy = [];
    const normRole = (role || '').toUpperCase();
    const readKey = normRole === 'ADMIN' ? 'admin' : (userId ? String(userId) : (email ? String(email) : 'anonymous'));
    if (!notif.readBy.includes(readKey)) {
      notif.readBy.push(readKey);
    }
    if (notif.targetUserId && (notif.targetUserId === userId || notif.targetUserId === email)) {
      notif.read = true;
    }

    const unreadCount = getUnreadCountFor(userId, role, email);
    if (normRole === 'ADMIN') {
      io.to('admin').emit('notification_read', { id, unreadCount });
      io.to('admin').emit('unread_count', unreadCount);
    } else {
      if (userId) {
        io.to(`user:${userId}`).emit('notification_read', { id, unreadCount });
        io.to(`user:${userId}`).emit('unread_count', unreadCount);
      }
      if (email) {
        io.to(`user:${email}`).emit('notification_read', { id, unreadCount });
        io.to(`user:${email}`).emit('unread_count', unreadCount);
      }
    }
    return res.json({ success: true, notification: notif, unreadCount });
  }
  res.status(404).json({ error: 'Notification not found' });
});

// POST mark all as read
app.post('/api/notifications/mark-all-read', (req, res) => {
  const userId = (req.body?.userId || req.query?.userId) ? String(req.body.userId || req.query.userId) : null;
  const role = (req.body?.role || req.query?.role) ? String(req.body.role || req.query.role) : null;
  const email = (req.body?.email || req.query?.email) ? String(req.body.email || req.query.email) : null;

  const normRole = (role || '').toUpperCase();
  const readKey = normRole === 'ADMIN' ? 'admin' : (userId ? String(userId) : (email ? String(email) : 'anonymous'));

  notifications.forEach(n => {
    if (isVisibleTo(n, userId, role, email)) {
      if (!n.readBy) n.readBy = [];
      if (!n.readBy.includes(readKey)) n.readBy.push(readKey);
      if (n.targetUserId && (n.targetUserId === userId || n.targetUserId === email)) n.read = true;
    }
  });

  if (normRole === 'ADMIN') {
    io.to('admin').emit('all_read', { unreadCount: 0 });
    io.to('admin').emit('unread_count', 0);
  } else {
    if (userId) {
      io.to(`user:${userId}`).emit('all_read', { unreadCount: 0 });
      io.to(`user:${userId}`).emit('unread_count', 0);
    }
    if (email) {
      io.to(`user:${email}`).emit('all_read', { unreadCount: 0 });
      io.to(`user:${email}`).emit('unread_count', 0);
    }
  }

  res.json({ success: true, unreadCount: 0 });
});

// DELETE single notification
app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const userId = (req.body?.userId || req.query?.userId) ? String(req.body.userId || req.query.userId) : null;
  const role = (req.body?.role || req.query?.role) ? String(req.body.role || req.query.role) : null;
  const email = (req.body?.email || req.query?.email) ? String(req.body.email || req.query.email) : null;

  notifications = notifications.filter(n => n.id !== id);
  const unreadCount = getUnreadCountFor(userId, role, email);
  res.json({ success: true, unreadCount });
});

// DELETE clear all notifications
app.delete('/api/notifications', (req, res) => {
  const userId = (req.body?.userId || req.query?.userId) ? String(req.body.userId || req.query.userId) : null;
  const role = (req.body?.role || req.query?.role) ? String(req.body.role || req.query.role) : null;
  const email = (req.body?.email || req.query?.email) ? String(req.body.email || req.query.email) : null;

  const normRole = (role || '').toUpperCase();
  if (normRole === 'ADMIN') {
    notifications = [];
    io.emit('notifications_cleared');
    io.emit('unread_count', 0);
  } else if (userId || email) {
    notifications = notifications.filter(n => !isVisibleTo(n, userId, role, email));
    if (userId) {
      io.to(`user:${userId}`).emit('notifications_cleared');
      io.to(`user:${userId}`).emit('unread_count', 0);
    }
    if (email) {
      io.to(`user:${email}`).emit('notifications_cleared');
      io.to(`user:${email}`).emit('unread_count', 0);
    }
  }

  res.json({ success: true, unreadCount: 0 });
});

// ── Slot Locks Store for Real-Time Soft-Locking ──────────────────────────────
const activeSlotLocks = new Map();
const HOLD_DURATION_MS = 2 * 60 * 1000; // 2-minute hold limit (User requirement: reduce too-long lock time)

function normalizeTimeSlot(time) {
  if (!time) return '';
  const str = String(time).trim();
  if (str.includes('T') && (str.endsWith('Z') || str.includes('+') || str.includes('-'))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Colombo'
      }).formatToParts(d);
      const hour = parts.find(p => p.type === 'hour')?.value || '00';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      return `${hour}:${minute}`;
    }
  }
  if (str.includes('T')) {
    const timePart = str.split('T')[1];
    if (timePart) {
      const [hStr, mStr] = timePart.split(':');
      if (hStr !== undefined && mStr !== undefined) {
        return `${hStr.padStart(2, '0')}:${mStr.substring(0, 2)}`;
      }
    }
  }
  if (str.toUpperCase().includes('AM') || str.toUpperCase().includes('PM')) {
    const isPm = str.toUpperCase().includes('PM');
    const cleaned = str.replace(/AM|PM/gi, '').trim();
    const [hStr, mStr] = cleaned.split(':');
    let h = parseInt(hStr, 10);
    if (!isNaN(h)) {
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      const m = mStr ? mStr.substring(0, 2) : '00';
      return `${String(h).padStart(2, '0')}:${m}`;
    }
  }
  const [hStr, mStr] = str.split(':');
  if (hStr !== undefined && mStr !== undefined) {
    const h = parseInt(hStr, 10);
    if (!isNaN(h)) {
      const m = mStr.substring(0, 2);
      return `${String(h).padStart(2, '0')}:${m}`;
    }
  }
  return str;
}

// Periodic cleanup of expired locks (every 1 second for instant release)
setInterval(() => {
  const now = Date.now();
  for (const [key, lock] of activeSlotLocks.entries()) {
    if (lock.expiresAt <= now) {
      activeSlotLocks.delete(key);
      io.emit('slot_unlocked', { key, stationId: lock.stationId, date: lock.date, timeSlot: lock.timeSlot });
      console.log(`[SlotLock] Auto-released expired hold on: ${key}`);
    }
  }
}, 1000);

// GET /api/slots/locks
app.get('/api/slots/locks', (req, res) => {
  res.json({ success: true, locks: Array.from(activeSlotLocks.values()) });
});

// POST /api/slots/event (Bridge from backend Spring Boot services)
app.post('/api/slots/event', (req, res) => {
  const { event, stationId, date, timeSlot } = req.body;
  if (!stationId || !date || !timeSlot) {
    return res.status(400).json({ error: 'Missing slot details (stationId, date, timeSlot)' });
  }
  const cleanSlot = normalizeTimeSlot(timeSlot);
  const key = `${stationId}_${date}_${cleanSlot}`;
  if (event === 'BOOKED') {
    activeSlotLocks.delete(key);
    io.emit('slot_booked_live', { key, stationId, date, timeSlot: cleanSlot });
    console.log(`[SlotLock HTTP] Slot booked live via backend Spring Boot event: ${key}`);
  } else if (event === 'RELEASED') {
    activeSlotLocks.delete(key);
    io.emit('slot_unlocked', { key, stationId, date, timeSlot: cleanSlot });
    console.log(`[SlotLock HTTP] Slot released/unlocked live via backend Spring Boot event: ${key}`);
  }
  res.json({ success: true, key, event });
});

// ── Socket.IO Connection Handler ──────────────────────────────────────────────
io.on('connection', (socket) => {
  const handshakeUserId = socket.handshake.auth?.userId || socket.handshake.query?.userId || null;
  const handshakeRole = socket.handshake.auth?.role || socket.handshake.query?.role || null;
  const handshakeEmail = socket.handshake.auth?.email || socket.handshake.query?.email || null;

  function setupClient(userId, role, email) {
    socket.data.userId = userId ? String(userId) : null;
    socket.data.role = role ? String(role).toUpperCase() : 'CUSTOMER';
    socket.data.email = email ? String(email) : null;

    if (socket.data.role === 'ADMIN') {
      socket.join('admin');
      console.log(`[Socket.IO] Client ${socket.id} joined 'admin' room`);
    }
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined 'user:${socket.data.userId}' room`);
    }
    if (socket.data.email) {
      socket.join(`user:${socket.data.email}`);
    }

    // Send initial filtered data to newly connected client
    socket.emit('init', {
      notifications: getNotificationsFor(socket.data.userId, socket.data.role, socket.data.email),
      unreadCount: getUnreadCountFor(socket.data.userId, socket.data.role, socket.data.email)
    });
    // Send active slot locks to client
    socket.emit('slot_locks', Array.from(activeSlotLocks.values()));
  }

  setupClient(handshakeUserId, handshakeRole, handshakeEmail);

  // ── Slot Hold and Release Events ───────────────────────────────────────────
  socket.on('lock_slot', ({ stationId, date, timeSlot, clientSessionId }) => {
    if (!stationId || !date || !timeSlot) return;
    const cleanSlot = normalizeTimeSlot(timeSlot);
    const key = `${stationId}_${date}_${cleanSlot}`;
    const expiresAt = Date.now() + HOLD_DURATION_MS;
    const lockInfo = {
      key,
      stationId,
      date,
      timeSlot: cleanSlot,
      userId: socket.data.userId || 'anonymous',
      userEmail: socket.data.email,
      socketId: socket.id,
      clientSessionId: clientSessionId || null,
      expiresAt
    };
    activeSlotLocks.set(key, lockInfo);
    io.emit('slot_locked', lockInfo);
    console.log(`[SlotLock] Slot held for 2 mins: ${key} by ${socket.data.email || socket.data.userId || socket.id}`);
  });

  socket.on('unlock_slot', ({ stationId, date, timeSlot }) => {
    if (!stationId || !date || !timeSlot) return;
    const cleanSlot = normalizeTimeSlot(timeSlot);
    const key = `${stationId}_${date}_${cleanSlot}`;
    if (activeSlotLocks.has(key)) {
      activeSlotLocks.delete(key);
      io.emit('slot_unlocked', { key, stationId, date, timeSlot: cleanSlot });
      console.log(`[SlotLock] Slot released/rolled back: ${key}`);
    }
  });

  socket.on('booking_confirmed_slot', ({ stationId, date, timeSlot }) => {
    if (!stationId || !date || !timeSlot) return;
    const cleanSlot = normalizeTimeSlot(timeSlot);
    const key = `${stationId}_${date}_${cleanSlot}`;
    activeSlotLocks.delete(key);
    io.emit('slot_booked_live', { key, stationId, date, timeSlot: cleanSlot });
    console.log(`[SlotLock] Slot confirmed booked live: ${key}`);
  });

  socket.on('identify', (payload) => {
    if (payload) {
      console.log(`[Socket.IO] Socket ${socket.id} identifying as`, payload);
      setupClient(payload.userId, payload.role, payload.email);
    }
  });

  socket.on('mark_read', (id) => {
    const userId = socket.data.userId;
    const role = socket.data.role;
    const email = socket.data.email;
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      if (!notif.readBy) notif.readBy = [];
      const normRole = (role || '').toUpperCase();
      const readKey = normRole === 'ADMIN' ? 'admin' : (userId ? String(userId) : (email ? String(email) : 'anonymous'));
      if (!notif.readBy.includes(readKey)) {
        notif.readBy.push(readKey);
      }
      if (notif.targetUserId && (notif.targetUserId === userId || notif.targetUserId === email)) {
        notif.read = true;
      }
      const unreadCount = getUnreadCountFor(userId, role, email);
      socket.emit('notification_read', { id, unreadCount });
      socket.emit('unread_count', unreadCount);
    }
  });

  socket.on('mark_all_read', () => {
    const userId = socket.data.userId;
    const role = socket.data.role;
    const email = socket.data.email;
    const normRole = (role || '').toUpperCase();
    const readKey = normRole === 'ADMIN' ? 'admin' : (userId ? String(userId) : (email ? String(email) : 'anonymous'));

    notifications.forEach(n => {
      if (isVisibleTo(n, userId, role, email)) {
        if (!n.readBy) n.readBy = [];
        if (!n.readBy.includes(readKey)) n.readBy.push(readKey);
        if (n.targetUserId && (n.targetUserId === userId || n.targetUserId === email)) n.read = true;
      }
    });

    socket.emit('all_read', { unreadCount: 0 });
    socket.emit('unread_count', 0);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    // Auto-release any active slot locks held by this disconnected client so slots return to Available
    for (const [key, lock] of activeSlotLocks.entries()) {
      if (lock.socketId === socket.id) {
        activeSlotLocks.delete(key);
        io.emit('slot_unlocked', { key, stationId: lock.stationId, date: lock.date, timeSlot: lock.timeSlot });
        console.log(`[SlotLock] Auto-released hold on client disconnect: ${key}`);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Real-Time Notification Socket Server listening on :${PORT}`);
  console.log(` Socket.IO endpoint: ws://localhost:${PORT}`);
  console.log(` REST notify endpoint: http://localhost:${PORT}/api/notify`);
  console.log(`=======================================================`);
});
