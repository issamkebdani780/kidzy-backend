import jwt from 'jsonwebtoken';

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال اسم المستخدم وكلمة المرور',
      });
    }

    const expectedUsername = process.env.ADMIN_USERNAME || 'issam kebdani';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'ISS@n2327';

    if (username.trim() === expectedUsername.trim() && password === expectedPassword) {
      const secret = process.env.JWT_SECRET || 'kidzy_super_secret_admin_token_2026';
      
      const token = jwt.sign(
        { username: expectedUsername },
        secret,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        token,
        admin: { username: expectedUsername }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في السيرفر أثناء تسجيل الدخول',
      error: error.message,
    });
  }
};
