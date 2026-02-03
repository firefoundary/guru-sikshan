import { Router } from 'express';
import { supabase } from './supabaseClient.js';

const router = Router();

// ==================== DASHBOARD ENDPOINTS ====================

// Get all issues (for admin dashboard)
router.get('/issues/all', async (req, res) => {
  const { status, cluster, limit = 50, offset = 0 } = req.query;

  try {
    let query = supabase
      .from('issues')
      .select('*, teachers!inner(name, email, employee_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    // Accept legacy status alias "in_review" -> actual "reviewed"
    const normalizedStatus =
      status === 'in_review' ? 'reviewed' : (status as string | undefined);

    if (normalizedStatus) {
      query = query.eq('status', normalizedStatus);
    }

    if (cluster) {
      query = query.eq('cluster', cluster);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const issues = (data || []).map((item: any) => ({
      id: item.id,
      teacherId: item.teacher_id,
      teacherName: item.teachers.name,
      teacherEmail: item.teachers.email,
      teacherEmployeeId: item.teachers.employee_id,
      cluster: item.cluster,
      category: item.category,
      description: item.description,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      adminRemarks: item.admin_remarks,
    }));

    res.json({
      success: true,
      issues,
      total: count,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Get all issues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update issue status (admin action)
router.patch('/issues/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, adminRemarks } = req.body as { status?: string; adminRemarks?: string };

  // Normalize legacy -> new enum
  const normalizedStatus =
    status === 'in_review' ? 'reviewed' : status;

  // Match your DB constraint: pending | reviewed | resolved | training_assigned
  const allowed = ['pending', 'reviewed', 'resolved', 'training_assigned'] as const;

  if (!normalizedStatus || !allowed.includes(normalizedStatus as any)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const updateData: any = {
      status: normalizedStatus,
      updated_at: new Date().toISOString(),
    };

    if (adminRemarks !== undefined) {
      updateData.admin_remarks = adminRemarks;
    }

    const { data, error } = await supabase
      .from('issues')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      issue: {
        id: data.id,
        teacherId: data.teacher_id,
        cluster: data.cluster,
        category: data.category,
        description: data.description,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        adminRemarks: data.admin_remarks,
      },
    });
  } catch (error) {
    console.error('Update issue status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete issue (admin only - for resolved items)
// This version preserves training assignments but removes issue link
router.delete('/issues/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // First, check if the issue exists and is resolved
    const { data: issue, error: fetchError } = await supabase
      .from('issues')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found',
      });
    }

    // Only allow deletion of resolved issues
    if (issue.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        error: 'Only resolved issues can be deleted',
      });
    }

    console.log(`🗑️ Deleting issue ${id} and related records...`);

    // Strategy:
    // 1. Delete AI responses
    // 2. Keep personalized_training and teacher_training_assignments
    // 3. Remove issue_id references from those tables
    // 4. Delete the issue

    // 1. Delete from ai_responses (renamed column: issue_id)
    const { error: aiError } = await supabase
      .from('ai_responses')
      .delete()
      .eq('issue_id', id);

    if (!aiError) console.log('  ✓ Deleted related ai_responses');

    // 2. Remove issue_id reference from personalized_training (renamed column: issue_id)
    const { error: trainingUpdateError } = await supabase
      .from('personalized_training')
      .update({ issue_id: null })
      .eq('issue_id', id);

    if (!trainingUpdateError) console.log('  ✓ Unlinked personalized_training from issue');

    // 3. Remove source_issue_id reference from teacher_training_assignments (renamed column: source_issue_id)
    const { error: assignmentUpdateError } = await supabase
      .from('teacher_training_assignments')
      .update({ source_issue_id: null })
      .eq('source_issue_id', id);

    if (!assignmentUpdateError) console.log('  ✓ Unlinked teacher_training_assignments from issue');

    // 4. Finally, delete the issue itself
    const { error: issueError } = await supabase
      .from('issues')
      .delete()
      .eq('id', id);

    if (issueError) throw issueError;

    console.log('✅ Issue deleted successfully (training preserved)');
    res.json({
      success: true,
      message: 'Issue deleted successfully. Related training records have been preserved.',
    });
  } catch (error) {
    console.error('❌ Delete issue error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const { data: allIssues, error } = await supabase
      .from('issues')
      .select('status, category, cluster');

    if (error) throw error;

    // Keep legacy response keys if your frontend still expects them:
    // inReview == reviewed, rejected == 0 (since DB enum no longer has rejected)
    const stats = {
      total: allIssues.length,
      byStatus: {
        pending: allIssues.filter(i => i.status === 'pending').length,
        inReview: allIssues.filter(i => i.status === 'reviewed').length,
        resolved: allIssues.filter(i => i.status === 'resolved').length,
        rejected: 0,
        // If/when your frontend supports it, you can also expose:
        // trainingAssigned: allIssues.filter(i => i.status === 'training_assigned').length,
      },
      byCategory: {
        academic: allIssues.filter(i => i.category === 'academic').length,
        infrastructure: allIssues.filter(i => i.category === 'infrastructure').length,
        administrative: allIssues.filter(i => i.category === 'administrative').length,
        safety: allIssues.filter(i => i.category === 'safety').length,
        technology: allIssues.filter(i => i.category === 'technology').length,
        other: allIssues.filter(i => i.category === 'other').length,
      },
      byClusters: allIssues.reduce((acc, i) => {
        acc[i.cluster] = (acc[i.cluster] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all teachers (for dashboard)
router.get('/teachers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('id, name, email, cluster, employee_id, created_at')
      .order('name');

    if (error) throw error;

    const teachers = data.map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      cluster: t.cluster,
      employeeId: t.employee_id,
      createdAt: t.created_at,
    }));

    res.json({ success: true, teachers });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/clusters', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('cluster')
      .order('cluster');

    if (error) throw error;

    const uniqueClusters = [...new Set(data.map(t => t.cluster))];

    res.json({
      success: true,
      clusters: uniqueClusters,
      count: uniqueClusters.length,
    });
  } catch (error) {
    console.error('Get clusters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== TRAINING MODULES (ADMIN CRUD) ====================

// Get all modules
router.get('/modules', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('training_modules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const modules = (data || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description || '',
      competencyArea: m.competency_area,
      difficultyLevel: m.difficulty_level,
      estimatedDuration: m.estimated_duration || '30-45 minutes',
      contentType: m.content_type || 'article',
      videoUrl: m.video_url,
      articleContent: m.article_content,
      fullContent: m.full_content,
      language: m.language || 'en',
      tags: m.tags || [],
      prerequisites: m.prerequisites || [],
      completionCount: m.completion_count || 0,
      averageRating: m.average_rating || 0,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      moduleSource: m.module_source || 'DIET',
      targetClusters: m.target_clusters || [],
      contextualMetadata: m.contextual_metadata || {},
    }));

    res.json({ success: true, modules });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create module
router.post('/modules', async (req, res) => {
  const {
    title,
    description,
    competencyArea,
    difficultyLevel,
    targetClusters,
    fullContent,
    contentType,
  } = req.body;

  if (!title || !competencyArea) {
    return res.status(400).json({ error: 'Title and competency area are required' });
  }

  try {
    const { data, error } = await supabase
      .from('training_modules')
      .insert({
        title,
        description,
        competency_area: competencyArea,
        difficulty_level: difficultyLevel || 'beginner',
        estimated_duration: '30-45 minutes',
        content_type: contentType || 'article',
        full_content: fullContent,
        article_content: fullContent,
        language: 'en',
        target_clusters: targetClusters || ['All Clusters'],
        module_source: 'ADMIN_DASHBOARD',
      })
      .select('*')
      .single();

    if (error) throw error;

    const module = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      competencyArea: data.competency_area,
      difficultyLevel: data.difficulty_level,
      estimatedDuration: data.estimated_duration,
      contentType: data.content_type,
      fullContent: data.full_content,
      articleContent: data.article_content,
      targetClusters: data.target_clusters || [],
      completionCount: 0,
      averageRating: 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      moduleSource: data.module_source,
    };

    console.log('Module created:', module.title);
    res.status(201).json({ success: true, module });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update module
router.put('/modules/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    competencyArea,
    difficultyLevel,
    targetClusters,
    fullContent,
    contentType,
  } = req.body;

  try {
    const updateData: any = {
      title,
      description,
      competency_area: competencyArea,
      difficulty_level: difficultyLevel,
      content_type: contentType,
      full_content: fullContent,
      article_content: fullContent,
      target_clusters: targetClusters,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('training_modules')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    const module = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      competencyArea: data.competency_area,
      difficultyLevel: data.difficulty_level,
      estimatedDuration: data.estimated_duration,
      contentType: data.content_type,
      fullContent: data.full_content,
      articleContent: data.article_content,
      targetClusters: data.target_clusters || [],
      completionCount: data.completion_count || 0,
      averageRating: data.average_rating || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      moduleSource: data.module_source,
    };

    console.log('✅ Module updated:', module.title);
    res.json({ success: true, module });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete module
router.delete('/modules/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('training_modules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Module deleted:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== TRAINING FEEDBACK ENDPOINTS (ADMIN) ====================

// Get all training feedback (admin view)
router.get('/training-feedback', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('training_feedback')
      .select(`
        *,
        training_modules (
          id, title, competency_area, difficulty_level
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

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
        competencyArea: item.training_modules.competency_area,
        difficultyLevel: item.training_modules.difficulty_level
      } : null
    }));

    res.json({ success: true, feedbacks });
  } catch (error) {
    console.error('Get training feedback error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get training feedback for a specific module
router.get('/training-feedback/module/:moduleId', async (req, res) => {
  const { moduleId } = req.params;

  try {
    const { data, error } = await supabase
      .from('training_feedback')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });

    if (error) throw error;

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
      createdAt: item.created_at
    }));

    res.json({ success: true, feedbacks });
  } catch (error) {
    console.error('Get module feedback error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get training feedback by teacher (admin view)
router.get('/training-feedback/teacher/:teacherId', async (req, res) => {
  const { teacherId } = req.params;

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

    if (error) throw error;

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

    res.json({ success: true, feedbacks });
  } catch (error) {
    console.error('Get teacher training feedback error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


export default router;
