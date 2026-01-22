import { Router } from 'express';
import { supabase } from './supabaseClient.js';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: path.resolve(__dirname, '../../..', '.env'),
});

// ✅ RE-ADDED: This was missing!
const router = Router();

// ✅ FIXED: Using IPv4 to prevent Mac connection issues
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

// ==================== AUTH ENDPOINTS ====================

router.get('/test-ai-config', (req, res) => {
  res.json({
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'NOT SET',
    isConfigured: !!process.env.AI_SERVICE_URL,
    nodeVersion: process.version,
  });
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const { data: teacher, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !teacher) return res.status(401).json({ error: 'Invalid credentials' });

    const isValidPassword = await bcrypt.compare(password, teacher.password_hash);
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const { password_hash, ...teacherData } = teacher;
    res.json({ success: true, teacher: teacherData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FEEDBACK ENDPOINTS ====================

// 🔍 DEBUG VERSION: Get all feedback for a teacher
router.get('/feedback/teacher/:teacherId', async (req, res) => {
  const { teacherId } = req.params;

  console.log(`\n🔍 HISTORY REQUEST: Checking feedback for Teacher ID: [${teacherId}]`);

  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase Query Error:', error.message);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} rows for THIS teacher.`);
    
    const feedbacks = data.map(item => ({
      id: item.id,
      teacherId: item.teacher_id,
      cluster: item.cluster,
      category: item.category,
      description: item.description,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      adminRemarks: item.admin_remarks,
    }));

    res.json({ success: true, feedbacks });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/feedback/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('feedback').select('*').eq('id', id).single();
    if (error || !data) return res.status(404).json({ error: 'Feedback not found' });
    res.json({ success: true, feedback: data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/feedback', async (req, res) => {
  const { teacherId, cluster, category, description } = req.body;
  console.log('📝 Feedback submission received:', { teacherId, cluster, category });

  try {
    // 1. Save to Supabase
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('feedback')
      .insert([{ teacher_id: teacherId, cluster, category, description, status: 'pending' }])
      .select()
      .single();

    if (feedbackError) throw feedbackError;
    console.log('✅ Feedback saved with ID:', feedbackData.id);

    // 2. Call AI Service
    let aiResponse = null;
    try {
      const aiServiceUrl = `${AI_SERVICE_URL}/api/feedback-to-training`;
      console.log('🤖 Calling AI Service at:', aiServiceUrl);
      
      const aiResult = await fetch(aiServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: teacherId,
          feedback_id: feedbackData.id,
          admin_id: 'system_auto'
        })
      });

      if (aiResult.ok) {
        const aiData = await aiResult.json();
        console.log('✅ AI Training Assigned');
        aiResponse = {
          suggestion: `Training Assigned: ${aiData.assigned_module}`,
          inferredGaps: aiData.inferred_gaps,
          priority: 'high'
        };
      }
    } catch (aiError) {
      console.error('⚠️ AI Service Unreachable (Skipping):', aiError);
    }

    res.status(201).json({
      success: true,
      feedback: feedbackData,
      aiResponse
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ RE-ADDED: This export is critical!
export default router;