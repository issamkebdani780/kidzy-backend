import { Router } from 'express';
import upload from '../middleware/upload.middleware.js';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} from '../controller/order.controller.js';

const router = Router();

// POST /api/orders — Submit a new order with child photo
// Field name for the image must be "image" (matches frontend form)
router.post('/', upload.single('image'), createOrder);

// GET /api/orders — List all orders (admin)
router.get('/', getAllOrders);

// GET /api/orders/:id — Get single order
router.get('/:id', getOrderById);

// PUT /api/orders/:id/status — Update order status
router.put('/:id/status', updateOrderStatus);

export default router;
