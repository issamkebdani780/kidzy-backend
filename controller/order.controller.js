import pool from '../database.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// ─────────────────────────────────────────────
// POST /api/orders
// Accepts multipart/form-data: kidName, phone, storyType, image (file)
// ─────────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    const { kidName, phone, storyType } = req.body;

    // Validate required fields
    if (!kidName || !phone || !storyType) {
      return res.status(400).json({
        success: false,
        message: 'kidName, phone, and storyType are required.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Child image is required.',
      });
    }

    // Upload image to Cloudinary
    const { url: imageUrl, public_id: imagePublicId } = await uploadToCloudinary(
      req.file.buffer,
      'kidzy/orders'
    );

    // Insert order into MySQL
    const [result] = await pool.query(
      `INSERT INTO orders (kid_name, phone, story_type, image_url, image_public_id, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [kidName, phone, storyType, imageUrl, imagePublicId]
    );

    // Track order initial history status
    try {
      await pool.query(
        `INSERT INTO order_histories (order_id, status, notes) VALUES (?, 'pending', 'Order placed successfully')`,
        [result.insertId]
      );
    } catch (histErr) {
      console.warn('⚠️ Failed to write initial order history:', histErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'تم تقديم طلبك بنجاح! سنتواصل معك قريباً.',
      orderId: result.insertId,
      imageUrl,
    });
  } catch (error) {
    console.error('❌ createOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة الطلب.',
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/orders
// Returns all orders (admin use)
// ─────────────────────────────────────────────
export const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [orders] = await pool.query(
      `SELECT id, kid_name, phone, story_type, image_url, kid_char_image_url, canva_url, status, created_at
       FROM orders
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM orders');

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      orders,
    });
  } catch (error) {
    console.error('❌ getAllOrders error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/orders/:id
// Returns a single order
// ─────────────────────────────────────────────
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('❌ getOrderById error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/orders/:id/status
// Update order status: pending → processing → shipped → delivered
// Body: { status: 'processing' }
// ─────────────────────────────────────────────
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'img_confiremed', 'in delivery', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const [result] = await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Track status change history
    try {
      await pool.query(
        `INSERT INTO order_histories (order_id, status, notes) VALUES (?, ?, CONCAT('Status updated to ', ?))`,
        [id, status, status]
      );
    } catch (histErr) {
      console.warn('⚠️ Failed to write order status history:', histErr.message);
    }

    return res.status(200).json({ success: true, message: 'Order status updated.', status });
  } catch (error) {
    console.error('❌ updateOrderStatus error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/orders/:id
// Permanently delete an order
// ─────────────────────────────────────────────
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM orders WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.status(200).json({ success: true, message: 'Order deleted successfully.' });
  } catch (error) {
    console.error('❌ deleteOrder error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/orders/:id/history
// Returns status update history logs for a specific order
// ─────────────────────────────────────────────
export const getOrderHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const [history] = await pool.query(
      'SELECT id, order_id, status, notes, created_at FROM order_histories WHERE order_id = ? ORDER BY created_at DESC',
      [id]
    );
    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.error('❌ getOrderHistory error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/orders/:id
// Update general order details including character image and Canva link
// ─────────────────────────────────────────────
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { canva_url, status } = req.body;

    // Fetch existing order
    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    let kidCharImageUrl = order.kid_char_image_url;
    let kidCharImagePublicId = order.kid_char_image_public_id;

    // Upload new character image to Cloudinary if supplied
    if (req.file) {
      const { url: imageUrl, public_id: imagePublicId } = await uploadToCloudinary(
        req.file.buffer,
        'kidzy/orders'
      );
      kidCharImageUrl = imageUrl;
      kidCharImagePublicId = imagePublicId;
    }

    // Prepare dynamic update query
    let updateFields = [];
    let params = [];

    // Always update character image fields (either new one uploaded or keeping old ones)
    updateFields.push('kid_char_image_url = ?', 'kid_char_image_public_id = ?');
    params.push(kidCharImageUrl, kidCharImagePublicId);

    if (canva_url !== undefined) {
      updateFields.push('canva_url = ?');
      params.push(canva_url === '' ? null : canva_url);
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'img_confiremed', 'in delivery', 'paid', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(', ')}`,
        });
      }
      updateFields.push('status = ?');
      params.push(status);
    }

    const updateQuery = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;
    params.push(id);

    await pool.query(updateQuery, params);

    // Logging: status change
    if (status !== undefined && status !== order.status) {
      try {
        await pool.query(
          `INSERT INTO order_histories (order_id, status, notes) VALUES (?, ?, CONCAT('Status updated to ', ?))`,
          [id, status, status]
        );
      } catch (histErr) {
        console.warn('⚠️ Failed to write status change history:', histErr.message);
      }
    }

    // Logging: updates to character image or Canva URL
    if (req.file || (canva_url !== undefined && canva_url !== order.canva_url)) {
      let noteParts = [];
      if (req.file) noteParts.push('character image uploaded');
      if (canva_url !== undefined && canva_url !== order.canva_url) noteParts.push('Canva URL updated');
      try {
        await pool.query(
          `INSERT INTO order_histories (order_id, status, notes) VALUES (?, ?, ?)`,
          [id, status || order.status, `Admin updated: ${noteParts.join(', ')}`]
        );
      } catch (histErr) {
        console.warn('⚠️ Failed to write order details history:', histErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Order updated successfully.',
      order: {
        id: parseInt(id),
        kid_name: order.kid_name,
        phone: order.phone,
        story_type: order.story_type,
        image_url: order.image_url,
        kid_char_image_url: kidCharImageUrl,
        canva_url: canva_url !== undefined ? (canva_url === '' ? null : canva_url) : order.canva_url,
        status: status !== undefined ? status : order.status,
        created_at: order.created_at
      }
    });
  } catch (error) {
    console.error('❌ updateOrder error:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

