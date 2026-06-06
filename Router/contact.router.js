import { Router } from 'express';
import { submitContact, getAllContacts } from '../controller/contact.controller.js';

const router = Router();

// POST /api/contact — Submit contact form
router.post('/', submitContact);

// GET /api/contact — Get all messages (admin)
router.get('/', getAllContacts);

export default router;
