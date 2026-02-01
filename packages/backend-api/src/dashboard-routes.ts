import { Router } from 'express';
import { supabase } from './supabaseClient.js';

const router = Router();

// ==================== DASHBOARD ENDPOINTS ====================

// Get all feedback (for admin dashboard)
router.get('/feedback/all', async (req, res) => {
  const { status, cluster, limit = 50, offset = 0 } = req.query;

  try {
    let query = supabase
      .from('feedback')
      .select('*, teachers!inner(name, email, employee_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (cluster) {
      query = query.eq('cluster', cluster);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const feedbacks = data.map(item => ({
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
      feedbacks,
      total: count,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Get all feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update feedback status (admin action)
router.patch('/feedback/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, adminRemarks } = req.body;

  if (!status || !['pending', 'in_review', 'resolved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (adminRemarks !== undefined) {
      updateData.admin_remarks = adminRemarks;
    }

    const { data, error } = await supabase
      .from('feedback')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      feedback: {
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
    console.error('Update feedback status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const { data: allFeedback, error } = await supabase
      .from('feedback')
      .select('status, category, cluster');

    if (error) {
      throw error;
    }

    const stats = {
      total: allFeedback.length,
      byStatus: {
        pending: allFeedback.filter(f => f.status === 'pending').length,
        inReview: allFeedback.filter(f => f.status === 'in_review').length,
        resolved: allFeedback.filter(f => f.status === 'resolved').length,
        rejected: allFeedback.filter(f => f.status === 'rejected').length,
      },
      byCategory: {
        academic: allFeedback.filter(f => f.category === 'academic').length,
        infrastructure: allFeedback.filter(f => f.category === 'infrastructure').length,
        administrative: allFeedback.filter(f => f.category === 'administrative').length,
        safety: allFeedback.filter(f => f.category === 'safety').length,
        technology: allFeedback.filter(f => f.category === 'technology').length,
        other: allFeedback.filter(f => f.category === 'other').length,
      },
      byClusters: allFeedback.reduce((acc, f) => {
        acc[f.cluster] = (acc[f.cluster] || 0) + 1;
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

    if (error) {
      throw error;
    }

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
        article_content: fullContent, // Copy to article_content for compatibility
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
      article_content: fullContent, // Keep in sync
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

export default router;

