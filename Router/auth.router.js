import { Router } from 'express';
import { loginAdmin } from '../controller/auth.controller.js';

const router = Router();

// POST /api/auth/login
router.post('/login', loginAdmin);

export default router;
