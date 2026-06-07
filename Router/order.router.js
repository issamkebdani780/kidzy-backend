import { Router } from 'express';
import upload from '../middleware/upload.middleware.js';
import authMiddleware from '../middleware/auth.middleware.js';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
} from '../controller/order.controller.js';

const router = Router();

// POST /api/orders — Submit a new order with child photo (Public)
router.post('/', upload.single('image'), createOrder);

// GET /api/orders — List all orders (Admin only)
router.get('/', authMiddleware, getAllOrders);

// GET /api/orders/:id — Get single order (Admin only)
router.get('/:id', authMiddleware, getOrderById);

// PUT /api/orders/:id/status — Update order status (Admin only)
router.put('/:id/status', authMiddleware, updateOrderStatus);

// DELETE /api/orders/:id — Delete an order (Admin only)
router.delete('/:id', authMiddleware, deleteOrder);

export default router;

