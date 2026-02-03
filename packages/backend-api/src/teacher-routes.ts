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

// ==================== ISSUES ENDPOINTS (was FEEDBACK) ====================

router.get('/issues/teacher/:teacherId', async (req, res) => {
  const { teacherId } = req.params;

  console.log(`\nHISTORY REQUEST: Checking issues for Teacher ID: [${teacherId}]`);

  try {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Query Error:', error.message);
      throw error;
    }

    console.log(`Found ${data?.length || 0} rows for THIS teacher.`);
    
    const issues = data.map(item => ({
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

    res.json({ success: true, issues });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Changed: /feedback/:id -> /issues/:id
router.get('/issues/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Changed: table('feedback') -> table('issues')
    const { data, error } = await supabase.from('issues').select('*').eq('id', id).single();
    if (error || !data) return res.status(404).json({ error: 'Issue not found' });
    res.json({ success: true, issue: data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Changed: /feedback -> /issues
router.post('/issues', async (req, res) => {
  const { teacherId, cluster, category, description } = req.body;
  
  console.log('Issue submission received:', teacherId, cluster, category);
  
  try {
    // Changed: table('feedback') -> table('issues')
    const { data: issueData, error: issueError } = await supabase
      .from('issues')
      .insert({
        teacher_id: teacherId,
        cluster,
        category,
        description,
        status: 'pending'
      })
      .select()
      .single();
    
    if (issueError) throw issueError;
    
    console.log(`Issue saved with ID: ${issueData.id}...`);
    
    let aiResponse = null;
    let fullAiResponse = null;
    
    try {
      const aiServiceUrl = `${AI_SERVICE_URL}/api/feedback-to-training`;
      console.log('Calling AI Service at:', aiServiceUrl);
      
      // Send both issue_id (new) and feedback_id (legacy) for backward compatibility
      const aiResult = await fetch(aiServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: teacherId,
          issue_id: issueData.id,
          feedback_id: issueData.id, // backward compatibility
          admin_id: 'system-auto'
        })
      });
      
      if (aiResult.ok) {
        const aiData = await aiResult.json();
        console.log('AI Service Response:', aiData);
        
        fullAiResponse = aiData;
        
        // Check for issue_deleted or feedback_deleted (backward compat)
        if ((aiData as any).issue_deleted || (aiData as any).feedback_deleted || (aiData as any).skipped_ai_call) {
          console.log('Training already assigned - issue deleted');
          
          return res.status(200).json({
            success: true,
            issue_deleted: (aiData as any).issue_deleted || (aiData as any).feedback_deleted,
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
      issue: issueData,
      aiResponse
    });
    
  } catch (error) {
    console.error('Submit issue error:', error);
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
      // Changed: source_feedback_id -> source_issue_id
      sourceIssueId: assignment.source_issue_id,
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

// ==================== TRAINING FEEDBACK ENDPOINTS ====================

// Submit training feedback (after completing a module)
router.post('/training-feedback', async (req, res) => {
  const {
    teacherId,
    teacherName,
    assignmentId,
    moduleId,
    rating,
    wasHelpful,
    comment,
    strengths,
    improvements,
    stillHasIssue,
    needsAdditionalSupport
  } = req.body;

  console.log('Training feedback submission received:', { teacherId, assignmentId, rating });

  // Validation
  if (!teacherId || !assignmentId || !moduleId || rating === undefined || wasHelpful === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: teacherId, assignmentId, moduleId, rating, wasHelpful'
    });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      error: 'Rating must be between 1 and 5'
    });
  }

  try {
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('training_feedback')
      .insert({
        teacher_id: teacherId,
        teacher_name: teacherName,
        assignment_id: assignmentId,
        module_id: moduleId,
        rating,
        was_helpful: wasHelpful,
        comment: comment || null,
        strengths: strengths || [],
        improvements: improvements || [],
        still_has_issue: stillHasIssue || false,
        needs_additional_support: needsAdditionalSupport || false
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Insert error:', feedbackError);
      throw feedbackError;
    }

    console.log(`✅ Training feedback saved with ID: ${feedbackData.id}`);

    // Return formatted response
    res.status(201).json({
      success: true,
      feedback: {
        id: feedbackData.id,
        teacherId: feedbackData.teacher_id,
        teacherName: feedbackData.teacher_name,
        assignmentId: feedbackData.assignment_id,
        moduleId: feedbackData.module_id,
        rating: feedbackData.rating,
        wasHelpful: feedbackData.was_helpful,
        comment: feedbackData.comment,
        strengths: feedbackData.strengths,
        improvements: feedbackData.improvements,
        stillHasIssue: feedbackData.still_has_issue,
        needsAdditionalSupport: feedbackData.needs_additional_support,
        createdAt: feedbackData.created_at
      }
    });

  } catch (error) {
    console.error('Submit training feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all training feedback for a teacher
router.get('/training-feedback/teacher/:teacherId', async (req, res) => {
  const { teacherId } = req.params;

  console.log(`Fetching training feedback for teacher: ${teacherId}`);

  try {
    const { data, error } = await supabase
      .from('training_feedback')
      .select(`
        *,
        training_modules (
          id, title, competency_area
        )
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    const feedbacks = (data || []).map((item: any) => ({
      id: item.id,
      teacherId: item.teacher_id,
      teacherName: item.teacher_name,
      assignmentId: item.assignment_id,
      moduleId: item.module_id,
      rating: item.rating,
      wasHelpful: item.was_helpful,
      comment: item.comment,
      strengths: item.strengths || [],
      improvements: item.improvements || [],
      stillHasIssue: item.still_has_issue,
      needsAdditionalSupport: item.needs_additional_support,
      createdAt: item.created_at,
      module: item.training_modules ? {
        id: item.training_modules.id,
        title: item.training_modules.title,
        competencyArea: item.training_modules.competency_area
      } : null
    }));

    console.log(`Found ${feedbacks.length} training feedback entries`);

    res.json({ success: true, feedbacks });
  } catch (error) {
    console.error('Get training feedback error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get training feedback for a specific assignment
router.get('/training-feedback/assignment/:assignmentId', async (req, res) => {
  const { assignmentId } = req.params;

  console.log(`Fetching training feedback for assignment: ${assignmentId}`);

  try {
    const { data, error } = await supabase
      .from('training_feedback')
      .select('*')
      .eq('assignment_id', assignmentId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Supabase error:', error);
      throw error;
    }

    if (!data) {
      return res.json({ success: true, feedback: null });
    }

    const feedback = {
      id: data.id,
      teacherId: data.teacher_id,
      teacherName: data.teacher_name,
      assignmentId: data.assignment_id,
      moduleId: data.module_id,
      rating: data.rating,
      wasHelpful: data.was_helpful,
      comment: data.comment,
      strengths: data.strengths || [],
      improvements: data.improvements || [],
      stillHasIssue: data.still_has_issue,
      needsAdditionalSupport: data.needs_additional_support,
      createdAt: data.created_at
    };

    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Get training feedback by assignment error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
