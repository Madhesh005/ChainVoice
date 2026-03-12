/**
 * Notification Routes
 * Routes for MSME notification system
 */

const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticate, requireMSME } = require('../middleware/authMiddleware');

// Get notifications for logged-in MSME
router.get('/', authenticate, requireMSME, NotificationController.getNotifications);

// Mark notification as read
router.post('/read/:id', authenticate, requireMSME, NotificationController.markAsRead);

module.exports = router;