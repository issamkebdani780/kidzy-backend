import pool from '../database.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Nodemailer transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─────────────────────────────────────────────
// POST /api/contact
// Body: { name, phone, message }
// ─────────────────────────────────────────────
export const submitContact = async (req, res) => {
  try {
    const { name, phone, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'name, phone, and message are required.',
      });
    }

    // Save to DB
    const [result] = await pool.query(
      `INSERT INTO contacts (name, phone, message) VALUES (?, ?, ?)`,
      [name, phone, message]
    );

    // Send email notification to admin (non-blocking — don't fail the request if email fails)
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `📩 رسالة جديدة من ${name} - Kidzy`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px; background: #f9fafb; border-radius: 12px;">
          <h2 style="color: #7c3aed;">رسالة جديدة من موقع Kidzy</h2>
          <table style="width:100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; font-weight: bold; color: #374151;">الاسم:</td>
              <td style="padding: 10px; color: #111827;">${name}</td>
            </tr>
            <tr style="background: #f3f4f6;">
              <td style="padding: 10px; font-weight: bold; color: #374151;">رقم الهاتف:</td>
              <td style="padding: 10px; color: #111827;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; color: #374151;">الرسالة:</td>
              <td style="padding: 10px; color: #111827;">${message}</td>
            </tr>
          </table>
          <p style="color: #6b7280; margin-top: 20px; font-size: 12px;">
            تم الإرسال في: ${new Date().toLocaleString('ar-DZ')}
          </p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions).catch((err) => {
      console.warn('⚠️  Email notification failed (non-critical):', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.',
      contactId: result.insertId,
    });
  } catch (error) {
    console.error('❌ submitContact error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إرسال الرسالة.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/contact
// Returns all contact messages (admin)
// ─────────────────────────────────────────────
export const getAllContacts = async (req, res) => {
  try {
    const [contacts] = await pool.query(
      'SELECT * FROM contacts ORDER BY created_at DESC'
    );
    return res.status(200).json({ success: true, contacts });
  } catch (error) {
    console.error('❌ getAllContacts error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/contact/:id
// Permanently delete a contact message
// ─────────────────────────────────────────────
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM contacts WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    return res.status(200).json({ success: true, message: 'Contact deleted successfully.' });
  } catch (error) {
    console.error('❌ deleteContact error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/contact/:id/view
// Mark a contact message as viewed (read)
// ─────────────────────────────────────────────
export const viewContact = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('UPDATE contacts SET is_viewed = 1 WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    return res.status(200).json({ success: true, message: 'Contact message marked as viewed.' });
  } catch (error) {
    console.error('❌ viewContact error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

