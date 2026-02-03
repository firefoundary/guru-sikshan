import { Router , Request } from 'express';
import { supabase } from './supabaseClient.js';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config({
  path: path.resolve(__dirname, '../../..', '.env'),
});


const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../ai-personalization/src');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
    }
  }
});

// ==================== RAG =====================

router.get('/rag/stats', async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/rag-stats`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('RAG stats error:', error);
    res.status(500).json({ error: 'Failed to fetch RAG stats' });
  }
});

router.post('/rag/upload-pdf', upload.single('pdf'), async (req , res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const { module_id, module_name, competency_area } = req.body;

    if (!module_id || !module_name || !competency_area) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Missing required fields: module_id, module_name, competency_area'
      });
    }

    console.log(`Processing PDF: ${req.file.originalname}`);
    console.log(`Module: ${module_name} (${competency_area})`);

    const { data: existingModule } = await supabase
      .from('training_modules')
      .select('id')
      .eq('id', module_id)
      .single();

    if (!existingModule) {
      await supabase.from('training_modules').insert({
        id: module_id,
        title: module_name,
        description: `Training module from ${req.file.originalname}`,
        competency_area: competency_area,
        content_type: 'article',
        pdf_storage_path: req.file.path,
        module_source: 'RAG_ADMIN'
      });
    }

    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(req.file.path));
    formData.append('module_id', module_id);
    formData.append('module_name', module_name);
    formData.append('competency_area', competency_area);

    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/upload-training-pdf`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      throw new Error((aiData as any).error || 'PDF processing failed');
    }

    await supabase.from('training_modules').update({
      chunk_count: (aiData as any).chunks,
      last_pdf_upload: new Date().toISOString(),
      pdf_storage_path: req.file.path
    }).eq('id', module_id);

    res.json({
      success: true,
      message: `PDF processed: ${(aiData as any).chunks} chunks created`,
      module_id: module_id,
      chunks: (aiData as any).chunks,
      file: req.file.originalname
    });

  } catch (error: any) {
    console.error('PDF upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message || 'PDF processing failed' });
  }
});

router.post('/rag/process-all-pdfs', async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/process-all-pdfs`, {
      method: 'POST'
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Process all PDFs error:', error);
    res.status(500).json({ error: 'Failed to process PDFs' });
  }
});

router.get('/modules/rag-status', async (req, res) => {
  try {
    const { data: modules, error } = await supabase
      .from('training_modules')
      .select('id, title, competency_area, chunk_count, last_pdf_upload, pdf_storage_path')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      modules: modules.map((m: any) => ({
        id: m.id,
        title: m.title,
        competency: m.competency_area,
        chunkCount: m.chunk_count || 0,
        hasRAG: (m.chunk_count || 0) > 0,
        lastUpload: m.last_pdf_upload,
        pdfPath: m.pdf_storage_path
      }))
    });
  } catch (error) {
    console.error('Get RAG status error:', error);
    res.status(500).json({ error: 'Failed to fetch module status' });
  }
});

// ==================== TEACHER MANAGEMENT (SUPER ADMIN) ====================

router.get('/teachers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('id, name, email, cluster, employee_id, created_at, updated_at')
      .order('name');

    if (error) throw error;

    const teachers = data.map((t: any) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      cluster: t.cluster,
      employeeId: t.employee_id,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    res.json({ success: true, teachers });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/teachers', async (req, res) => {
  const { name, email, cluster, employeeId, password } = req.body;

  if (!name || !email || !cluster || !employeeId || !password) {
    return res.status(400).json({
      success: false,
      error: 'All fields are required: name, email, cluster, employeeId, password'
    });
  }

  try {
    const { data: existingEmail } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    const { data: existingEmployeeId } = await supabase
      .from('teachers')
      .select('id')
      .eq('employee_id', employeeId)
      .single();

    if (existingEmployeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('teachers')
      .insert({
        name,
        email: email.toLowerCase(),
        cluster,
        employee_id: employeeId,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (error) throw error;

    const teacher = {
      id: data.id,
      name: data.name,
      email: data.email,
      cluster: data.cluster,
      employeeId: data.employee_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    console.log('Teacher created:', teacher.name);
    res.status(201).json({ success: true, teacher });
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, cluster, employeeId, password } = req.body;

  try {
    const updateData: any = {};
    if (name) updateData.name = name;
    if (cluster) updateData.cluster = cluster;
    if (email) updateData.email = email.toLowerCase();
    if (employeeId) updateData.employee_id = employeeId;

    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    updateData.updated_at = new Date().toISOString();

    if (email) {
      const { data: existingEmail } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', email.toLowerCase())
        .neq('id', id)
        .single();

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    if (employeeId) {
      const { data: existingEmployeeId } = await supabase
        .from('teachers')
        .select('id')
        .eq('employee_id', employeeId)
        .neq('id', id)
        .single();

      if (existingEmployeeId) {
        return res.status(400).json({
          success: false,
          error: 'Employee ID already exists'
        });
      }
    }

    const { data, error } = await supabase
      .from('teachers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const teacher = {
      id: data.id,
      name: data.name,
      email: data.email,
      cluster: data.cluster,
      employeeId: data.employee_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    console.log('Teacher updated:', teacher.name);
    res.json({ success: true, teacher });
  } catch (error) {
    console.error('Update teacher error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/teachers/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: issue } = await supabase
      .from('issue')
      .select('id')
      .eq('teacher_id', id)
      .limit(1);

    const { data: assignments } = await supabase
      .from('teacher_training_assignments')
      .select('id')
      .eq('teacher_id', id)
      .limit(1);

    if (issue && issue.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete teacher with existing Issue. Please resolve or delete the issue first.'
      });
    }

    if (assignments && assignments.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete teacher with training assignments. Please remove assignments first.'
      });
    }

    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('Teacher deleted:', id);
    res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ==================== ADMIN AUTH ====================

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  try {
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

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    await supabase
      .from('admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    await supabase.from('admin_activity_logs').insert({
      admin_id: admin.id,
      action: 'login',
      ip_address: req.ip,
    });

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

router.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and password are required'
    });
  }

  try {
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
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
      throw error;
    }

    console.log('Admin created:', admin.email);
    res.status(201).json({ success: true, admin });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

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

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('Admin deleted:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

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
    const { data: admin, error } = await supabase
      .from('admins')
      .select('password_hash')
      .eq('id', id)
      .single();

    if (error || !admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, admin.password_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

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
