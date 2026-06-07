import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { submitContact, getAllContacts, deleteContact } from '../controller/contact.controller.js';

const router = Router();

// POST /api/contact — Submit contact form (Public)
router.post('/', submitContact);

// GET /api/contact — Get all messages (Admin only)
router.get('/', authMiddleware, getAllContacts);

// DELETE /api/contact/:id — Delete a contact message (Admin only)
router.delete('/:id', authMiddleware, deleteContact);

export default router;

