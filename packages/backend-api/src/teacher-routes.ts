import { Router } from 'express';
import { supabase } from './supabaseClient.js';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: path.resolve(__dirname, '../../..', '.env'),
});

const router = Router();

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

router.get('/feedback/teacher/:teacherId', async (req, res) => {
  const { teacherId } = req.params;

  console.log(`\nHISTORY REQUEST: Checking feedback for Teacher ID: [${teacherId}]`);

  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Query Error:', error.message);
      throw error;
    }

    console.log(`Found ${data?.length || 0} rows for THIS teacher.`);
    
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
  
  console.log('Feedback submission received:', teacherId, cluster, category);
  
  try {
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('feedback')
      .insert({
        teacher_id: teacherId,
        cluster,
        category,
        description,
        status: 'pending'
      })
      .select()
      .single();
    
    if (feedbackError) throw feedbackError;
    
    console.log(`Feedback saved with ID: ${feedbackData.id}...`);
    
    let aiResponse = null;
    let fullAiResponse = null;
    
    try {
      const aiServiceUrl = `${AI_SERVICE_URL}/api/feedback-to-training`;
      console.log('Calling AI Service at:', aiServiceUrl);
      
      const aiResult = await fetch(aiServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: teacherId,
          feedback_id: feedbackData.id,
          admin_id: 'system-auto'
        })
      });
      
      if (aiResult.ok) {
        const aiData = await aiResult.json();
        console.log('AI Service Response:', aiData);
        
        fullAiResponse = aiData;
        
        if ((aiData as any).feedback_deleted || (aiData as any).skipped_ai_call) {
          console.log('Training already assigned - feedback deleted');
          
          return res.status(200).json({
            success: true,
            feedback_deleted: (aiData as any).feedback_deleted,
            skipped_ai_call: (aiData as any).skipped_ai_call,
            message: (aiData as any).message,
            reason: (aiData as any).reason,
            already_existed: true
          });
        }
        
        aiResponse = {
          suggestion: `Training Assigned: ${(aiData as any).assigned_module}`,
          inferredGaps: (aiData as any).inferred_gaps,
          priority: 'high'
        };
      }
    } catch (aiError) {
      console.error('AI Service Unreachable - Skipping:', aiError);
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

// ==================== TRAINING ENDPOINTS ====================

router.get('/training/:teacherId', async (req, res) => {
  const { teacherId } = req.params;
  
  console.log(`Fetching training assignments for teacher: ${teacherId}`);
  
  try {
    const { data: assignments, error: assignmentError } = await supabase
      .from('teacher_training_assignments')
      .select(`
        *,
        training_modules (
          id, title, description, competency_area, difficulty_level,
          estimated_duration, content_type, video_url, article_content
        )
      `)
      .eq('teacher_id', teacherId)
      .order('assigned_date', { ascending: false });

    if (assignmentError) {
      console.error('Supabase error:', assignmentError);
      throw assignmentError;
    }

    console.log(`Found ${assignments?.length || 0} assignments in database`);

    const { data: personalizedData, error: personalizedError } = await supabase
      .from('personalized_training')
      .select('module_id, personalized_content')
      .eq('teacher_id', teacherId);

    if (personalizedError) {
      console.warn('Could not fetch personalized content:', personalizedError);
    }

    const personalizedMap: Record<string, string> = {};
    if (personalizedData) {
      personalizedData.forEach(p => {
        personalizedMap[p.module_id] = p.personalized_content;
      });
    }

    console.log(`Found ${Object.keys(personalizedMap).length} personalized content entries`);

    const trainings = assignments?.map(assignment => ({
      id: assignment.id,
      teacherId: assignment.teacher_id,
      moduleId: assignment.module_id,
      assignedBy: assignment.assigned_by,
      assignedReason: assignment.assigned_reason,
      sourceFeedbackId: assignment.source_feedback_id,
      status: assignment.status,
      progressPercentage: assignment.progress_percentage || 0,
      assignedDate: assignment.assigned_date,
      startedAt: assignment.started_at,
      completedAt: assignment.completed_at,
      dueDate: assignment.due_date,
      videoWatchTimeSeconds: assignment.video_watch_time_seconds || 0,
      videoCompleted: assignment.video_completed || false,
      module: assignment.training_modules ? {
        id: assignment.training_modules.id,
        title: assignment.training_modules.title,
        description: assignment.training_modules.description,
        competencyArea: assignment.training_modules.competency_area,
        difficultyLevel: assignment.training_modules.difficulty_level,
        estimatedDuration: assignment.training_modules.estimated_duration,
        contentType: assignment.training_modules.content_type,
        videoUrl: assignment.training_modules.video_url,
        articleContent: assignment.training_modules.article_content,
      } : undefined,
      personalizedContent: personalizedMap[assignment.module_id] || null,
    })) || [];

    console.log(`Sending ${trainings.length} training assignments to frontend`);
    
    res.json({ success: true, trainings });
  } catch (error) {
    console.error('Get training error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/training/:trainingId/progress', async (req, res) => {
  const { trainingId } = req.params;
  const { progress_percentage, status, started_at, completed_at } = req.body;

  console.log(`Updating progress for training ${trainingId}:`, { progress_percentage, status });

  try {
    const updateData: any = { 
      progress_percentage,
      status
    };
    
    if (started_at) updateData.started_at = started_at;
    if (completed_at) updateData.completed_at = completed_at;

    const { data, error } = await supabase
      .from('teacher_training_assignments')
      .update(updateData)
      .eq('id', trainingId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      throw error;
    }

    console.log('Progress updated successfully');

    res.json({ success: true, training: data });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;