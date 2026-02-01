import { Router } from 'express';
import { supabase } from './supabaseClient.js';
import bcrypt from 'bcrypt';

const router = Router();

// ==================== ADMIN AUTH ====================

// Admin login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email and password are required' 
    });
  }

  try {
    // Get admin by email
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    await supabase
      .from('admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Log activity
    await supabase.from('admin_activity_logs').insert({
      admin_id: admin.id,
      action: 'login',
      ip_address: req.ip,
    });

    // Remove password from response
    const { password_hash, ...adminData } = admin;

    res.json({ 
      success: true, 
      admin: {
        id: adminData.id,
        name: adminData.name,
        email: adminData.email,
        role: adminData.role,
        permissions: adminData.permissions,
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get admin profile
router.get('/profile/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, name, email, role, permissions, created_at, last_login')
      .eq('id', id)
      .single();

    if (error || !admin) {
      return res.status(404).json({ 
        success: false, 
        error: 'Admin not found' 
      });
    }

    res.json({ success: true, admin });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ==================== ADMIN MANAGEMENT ====================

// Get all admins (super_admin only)
router.get('/', async (req, res) => {
  try {
    const { data: admins, error } = await supabase
      .from('admins')
      .select('id, name, email, role, is_active, created_at, last_login')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create new admin
router.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Name, email, and password are required' 
    });
  }

  try {
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const { data: admin, error } = await supabase
      .from('admins')
      .insert({
        name,
        email,
        password_hash,
        role: role || 'admin',
      })
      .select('id, name, email, role, created_at')
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ 
          success: false, 
          error: 'Email already exists' 
        });
      }
      throw error;
    }

    console.log('✅ Admin created:', admin.email);
    res.status(201).json({ success: true, admin });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update admin
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role, is_active, permissions } = req.body;

  try {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;
    if (permissions) updateData.permissions = permissions;

    const { data: admin, error } = await supabase
      .from('admins')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, role, is_active, permissions')
      .single();

    if (error) throw error;

    res.json({ success: true, admin });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete admin
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Admin deleted:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Change password
router.post('/:id/change-password', async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      error: 'Current and new passwords are required' 
    });
  }

  try {
    // Get current admin
    const { data: admin, error } = await supabase
      .from('admins')
      .select('password_hash')
      .eq('id', id)
      .single();

    if (error || !admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await supabase
      .from('admins')
      .update({ 
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get activity logs
router.get('/logs/:adminId', async (req, res) => {
  const { adminId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const { data: logs, error } = await supabase
      .from('admin_activity_logs')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json({ success: true, logs });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
