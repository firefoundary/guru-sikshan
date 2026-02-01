// API service for DIET Admin Dashboard
// Connects to backend running on port 3000

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const AI_SERVICE_URL = import.meta.env.VITE_AI_URL || 'http://localhost:5001';

// Types matching the Supabase schema
export interface Teacher {
  id: string;
  name: string;
  email: string;
  cluster: string;
  employeeId: string;
  createdAt: string;
  // Extended fields for UI display
  phone?: string;
  school?: string;
  subject?: string;
  status?: 'active' | 'inactive';
  modulesCompleted?: number;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'viewer';
  permissions: {
    view_feedback: boolean;
    manage_modules: boolean;
    assign_training: boolean;
    manage_teachers: boolean;
  };
  createdAt?: string;
  lastLogin?: string;
  isActive?: boolean;
}

export interface Feedback {
  id: string;
  teacherId: string;
  teacherName?: string;
  teacherEmail?: string;
  teacherEmployeeId?: string;
  cluster: string;
  category: 'academic' | 'infrastructure' | 'administrative' | 'safety' | 'technology' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'training_assigned' | 'in_review' | 'rejected';
  adminRemarks?: string;
  createdAt: string;
  updatedAt: string;
  trainingRating?: number;
  trainingComment?: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  description?: string;
  competencyArea: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  contentType: 'video' | 'article' | 'interactive' | 'mixed';
  videoUrl?: string;
  articleContent?: string;
  language: string;
  tags?: string[];
  prerequisites?: string[];
  completionCount: number;
  averageRating: number;
  createdAt: string;
  updatedAt: string;
  contentUrl?: string;
  fullContent?: string;
  contentDocumentUrl?: string;
  moduleSource: string;
  targetClusters?: string[];
  contextualMetadata?: Record<string, unknown>;
}

export interface TeacherTrainingAssignment {
  id: string;
  teacherId: string;
  moduleId: string;
  assignedBy: string;
  assignedReason?: string;
  sourceFeedbackId?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  progressPercentage: number;
  assignedDate: string;
  startedAt?: string;
  completedAt?: string;
  dueDate: string;
  videoWatchTimeSeconds: number;
  videoCompleted: boolean;
  module?: TrainingModule;
  personalizedContent?: string;
}

export interface DashboardStats {
  total: number;
  byStatus: {
    pending: number;
    inReview: number;
    resolved: number;
    rejected: number;
  };
  byCategory: {
    academic: number;
    infrastructure: number;
    administrative: number;
    safety: number;
    technology: number;
    other: number;
  };
  byClusters: Record<string, number>;
}

export interface AIResponse {
  suggestion: string;
  inferredGaps?: string[];
  priority?: string;
}

// Legacy type alias for backward compatibility
export interface FeedbackIssue extends Feedback {
  teacherName: string;
  moduleId?: string;
  moduleName?: string;
  issueType?: string;
  priority?: 'low' | 'medium' | 'high';
}

// API Functions
export const api = {
  
  // ==================== DASHBOARD ENDPOINTS ====================

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch stats');
    return data.stats;
  },

  // ==================== TEACHERS ENDPOINTS ====================

  async getTeachers(): Promise<Teacher[]> {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/teachers`);
    if (!response.ok) throw new Error('Failed to fetch teachers');
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch teachers');
    return data.teachers;
  },

  async getTeacher(id: string): Promise<Teacher | null> {
    const teachers = await this.getTeachers();
    return teachers.find(t => t.id === id) || null;
  },

  async deleteTeacher(id: string): Promise<boolean> {
    // Note: This would need a backend endpoint to be implemented
    console.warn('Delete teacher not implemented on backend');
    return false;
  },

  // ==================== FEEDBACK ENDPOINTS ====================

  async getFeedback(status?: string, cluster?: string, limit = 50, offset = 0): Promise<{ feedbacks: Feedback[]; total: number }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (cluster) params.append('cluster', cluster);
    params.append('limit', String(limit));
    params.append('offset', String(offset));

    const response = await fetch(`${API_BASE_URL}/api/dashboard/feedback/all?${params}`);
    if (!response.ok) throw new Error('Failed to fetch feedback');
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch feedback');
    return { feedbacks: data.feedbacks, total: data.total };
  },

  async getAllFeedback(): Promise<Feedback[]> {
    const { feedbacks } = await this.getFeedback();
    return feedbacks;
  },

  async getFeedbackByTeacher(teacherId: string): Promise<Feedback[]> {
    const response = await fetch(`${API_BASE_URL}/api/teacher/feedback/teacher/${teacherId}`);
    if (!response.ok) throw new Error('Failed to fetch feedback');
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch feedback');
    return data.feedbacks;
  },

  async getFeedbackById(id: string): Promise<Feedback | null> {
    const response = await fetch(`${API_BASE_URL}/api/teacher/feedback/${id}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.success) return null;
    return data.feedback;
  },

  async updateFeedbackStatus(id: string, status: string, adminRemarks?: string): Promise<Feedback | null> {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/feedback/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminRemarks }),
    });
    if (!response.ok) throw new Error('Failed to update feedback status');
    const data = await response.json();
    if (!data.success) throw new Error('Failed to update feedback status');
    return data.feedback;
  },

  async submitFeedback(teacherId: string, cluster: string, category: string, description: string): Promise<{ feedback: Feedback; aiResponse?: AIResponse }> {
    const response = await fetch(`${API_BASE_URL}/api/teacher/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, cluster, category, description }),
    });
    if (!response.ok) throw new Error('Failed to submit feedback');
    return response.json();
  },

 // ==================== TRAINING ENDPOINTS ====================

async getTrainingModules(): Promise<TrainingModule[]> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/modules`);
  if (!response.ok) throw new Error('Failed to fetch modules');
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch modules');
  return data.modules as TrainingModule[];
},

async createModule(moduleData: {
  title: string;
  description: string;
  competencyArea: string;
  difficultyLevel: TrainingModule['difficultyLevel'];
  targetClusters: string[];
  fullContent: string;
  contentType: TrainingModule['contentType'];
}): Promise<TrainingModule> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/modules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(moduleData),
  });
  if (!response.ok) throw new Error('Failed to create module');
  const data = await response.json();
  if (!data.success) throw new Error('Failed to create module');
  return data.module as TrainingModule;
},

async updateModule(id: string, moduleData: {
  title: string;
  description: string;
  competencyArea: string;
  difficultyLevel: TrainingModule['difficultyLevel'];
  targetClusters: string[];
  fullContent: string;
  contentType: TrainingModule['contentType'];
}): Promise<TrainingModule> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/modules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(moduleData),
  });
  if (!response.ok) throw new Error('Failed to update module');
  const data = await response.json();
  if (!data.success) throw new Error('Failed to update module');
  return data.module as TrainingModule;
},

async deleteModule(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/modules/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete module');
  const data = await response.json();
  if (!data.success) throw new Error('Failed to delete module');
},


  // ==================== AI SERVICE ENDPOINTS ====================

  async analyzeFeedback(teacherId: string): Promise<unknown> {
    const response = await fetch(`${API_BASE_URL}/api/analyze-feedback/${teacherId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Analysis failed');
    return response.json();
  },

  async assignTraining(teacherId: string, feedbackId: string, adminId = 'admin-001'): Promise<unknown> {
    const response = await fetch(`${AI_SERVICE_URL}/api/feedback-to-training`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_id: teacherId, feedback_id: feedbackId, admin_id: adminId }),
    });
    if (!response.ok) throw new Error('Failed to assign training');
    return response.json();
  },

  // ==================== AUTH ENDPOINTS ====================

  async login(email: string, password: string): Promise<{ success: boolean; teacher?: Teacher; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/teacher/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Login failed' };
    }
    
    return { success: true, teacher: data.teacher };
  },

  // ==================== HEALTH CHECK ====================

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error('Backend unavailable');
    return response.json();
  },

  // ==================== ADMIN ENDPOINTS ====================
  
  async adminLogin(email: string, password: string): Promise<{ success: boolean; admin?: Admin; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Login failed' };
    }
    
    return { success: true, admin: data.admin };
  },

  async getAdmins(): Promise<Admin[]> {
    const response = await fetch(`${API_BASE_URL}/api/admin`);
    if (!response.ok) throw new Error('Failed to fetch admins');
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch admins');
    return data.admins;
  },

  async createAdmin(admin: { name: string; email: string; password: string; role?: string }): Promise<Admin> {
    const response = await fetch(`${API_BASE_URL}/api/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(admin),
    });
    if (!response.ok) throw new Error('Failed to create admin');
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to create admin');
    return data.admin;
  },

  async updateAdmin(id: string, updates: Partial<Admin>): Promise<Admin> {
    const response = await fetch(`${API_BASE_URL}/api/admin/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update admin');
    const data = await response.json();
    if (!data.success) throw new Error('Failed to update admin');
    return data.admin;
  },

  async deleteAdmin(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/admin/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete admin');
  },

  async changeAdminPassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/admin/${id}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) throw new Error('Failed to change password');
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to change password');
  },
};

export default api;