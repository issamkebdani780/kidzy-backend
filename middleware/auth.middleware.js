import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'kidzy_super_secret_admin_token_2026';

    const decoded = jwt.verify(token, secret);
    req.admin = decoded; // { username: ... }
    next();
  } catch (error) {
    console.error('🔑 Auth validation error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

export default authMiddleware;
