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

function getUnreadCount() {
  return notifications.filter(n => !n.read).length;
}

// ── REST API Endpoints ────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    connectedClients: io.engine.clientsCount,
    totalNotifications: notifications.length,
    unreadCount: getUnreadCount()
  });
});

// GET all notifications
app.get('/api/notifications', (req, res) => {
  res.json({
    notifications,
    unreadCount: getUnreadCount()
  });
});

// POST new notification (Called by backend microservices or admin walk-in)
app.post('/api/notify', (req, res) => {
  const {
    id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    type = 'SYSTEM_ALERT',
    category = 'BOOKING',
    title = 'System Notification',
    message = '',
    referenceId = '',
    link = '/admin',
    metadata = {}
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
    read: false,
    createdAt: new Date().toISOString()
  };

  // Add to top of list and cap history at 100 items
  notifications.unshift(newNotification);
  if (notifications.length > 100) {
    notifications = notifications.slice(0, 100);
  }

  const unreadCount = getUnreadCount();

  // Broadcast to all connected Socket.IO admin clients!
  io.emit('notification', newNotification);
  io.emit('unread_count', unreadCount);

  console.log(`[Socket.IO Notify] Emitted '${type}': ${title} - ${message} (Unread: ${unreadCount})`);

  res.status(201).json({
    success: true,
    notification: newNotification,
    unreadCount
  });
});

// PATCH mark notification as read
app.patch('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const notif = notifications.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    const unreadCount = getUnreadCount();
    io.emit('notification_read', { id, unreadCount });
    io.emit('unread_count', unreadCount);
    return res.json({ success: true, notification: notif, unreadCount });
  }
  res.status(404).json({ error: 'Notification not found' });
});

// POST mark all as read
app.post('/api/notifications/mark-all-read', (req, res) => {
  notifications.forEach(n => n.read = true);
  io.emit('all_read', { unreadCount: 0 });
  io.emit('unread_count', 0);
  res.json({ success: true, unreadCount: 0 });
});

// DELETE single notification
app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  notifications = notifications.filter(n => n.id !== id);
  const unreadCount = getUnreadCount();
  io.emit('unread_count', unreadCount);
  res.json({ success: true, unreadCount });
});

// DELETE clear all notifications
app.delete('/api/notifications', (req, res) => {
  notifications = [];
  io.emit('notifications_cleared');
  io.emit('unread_count', 0);
  res.json({ success: true, unreadCount: 0 });
});

// ── Socket.IO Connection Handler ──────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Admin client connected: ${socket.id}`);

  // Send initial data to newly connected client
  socket.emit('init', {
    notifications,
    unreadCount: getUnreadCount()
  });

  socket.on('mark_read', (id) => {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      const unreadCount = getUnreadCount();
      io.emit('notification_read', { id, unreadCount });
      io.emit('unread_count', unreadCount);
    }
  });

  socket.on('mark_all_read', () => {
    notifications.forEach(n => n.read = true);
    io.emit('all_read', { unreadCount: 0 });
    io.emit('unread_count', 0);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Admin client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Real-Time Notification Socket Server listening on :${PORT}`);
  console.log(` Socket.IO endpoint: ws://localhost:${PORT}`);
  console.log(` REST notify endpoint: http://localhost:${PORT}/api/notify`);
  console.log(`=======================================================`);
});
