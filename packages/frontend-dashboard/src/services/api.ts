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

export interface Issue {
  id: string;
  teacherId: string;
  teacherName?: string;
  teacherEmail?: string;
  teacherEmployeeId?: string;
  cluster: string;
  category: 'academic' | 'infrastructure' | 'administrative' | 'safety' | 'technology' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'training_assigned'; 
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
  sourceIssueId?: string;
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
export interface FeedbackIssue extends Issue {
  teacherName: string;
  moduleId?: string;
  moduleName?: string;
  issueType?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface TrainingFeedback {
  id: string;
  teacherId: string;
  teacherName: string;
  assignmentId: string;
  moduleId: string;
  rating: number;
  wasHelpful: boolean;
  comment: string | null;
  strengths: string[];
  improvements: string[];
  stillHasIssue: boolean;
  needsAdditionalSupport: boolean;
  createdAt: string;
  module?: {
    id: string;
    title: string;
    competencyArea: string;
  };
}

// API Functions
export const api = {
  // ==================== RAG ENDPOINTS ====================
  async getRagStats(): Promise<{ total_modules: number; total_chunks: number; vectorized: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/rag/stats`);
    if (!response.ok) throw new Error('Failed to fetch RAG stats');
    const data = await response.json();
    return data;
  },

  async uploadPdfForModule(
    file: File,
    moduleId: string,
    moduleName: string,
    competencyArea: string
  ): Promise<{ success: boolean; message: string; chunks: number }> {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('module_id', moduleId);
    formData.append('module_name', moduleName);
    formData.append('competency_area', competencyArea);

    const response = await fetch(`${API_BASE_URL}/api/admin/rag/upload-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to upload PDF');
    }

    return response.json();
  },

  async processAllPdfs(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/rag/process-all-pdfs`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error('Failed to process PDFs');
    return response.json();
  },

  async getModulesRagStatus(): Promise<{
    success: boolean;
    modules: Array<{
      id: string;
      title: string;
      competency: string;
      chunkCount: number;
      hasRAG: boolean;
      lastUpload: string | null;
      pdfPath: string | null;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/modules/rag-status`);
    if (!response.ok) throw new Error('Failed to fetch RAG status');
    return response.json();
  },

  
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

  async getClusters(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/clusters`);
    if (!response.ok) throw new Error('Failed to fetch clusters');
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch clusters');
    return data.clusters;
  },
  
  async createTeacher(teacher: {
    name: string;
    email: string;
    cluster: string;
    employeeId: string;
    password: string;
  }): Promise<Teacher> {
    const response = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacher),
    });
  
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create teacher');
    }
  
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create teacher');
    }
  
    return data.teacher;
  },
  
  async updateTeacher(id: string, updates: {
    name?: string;
    email?: string;
    cluster?: string;
    employeeId?: string;
    password?: string;
  }): Promise<Teacher> {
    const response = await fetch(`${API_BASE_URL}/api/admin/teachers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update teacher');
    }
  
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to update teacher');
    }
  
    return data.teacher;
  },
  
  async deleteTeacher(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/admin/teachers/${id}`, {
      method: 'DELETE',
    });
  
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete teacher');
    }
  
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete teacher');
    }
  },

  async getTeacher(id: string): Promise<Teacher | null> {
    const teachers = await this.getTeachers();
    return teachers.find(t => t.id === id) || null;
  },

  // ==================== ISSUES ENDPOINTS (replaces FEEDBACK) ====================

async getIssues(
  status?: string,
  cluster?: string,
  limit = 50,
  offset = 0
): Promise<{ issues: Issue[]; total: number }> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (cluster) params.append('cluster', cluster);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  const response = await fetch(`${API_BASE_URL}/api/dashboard/issues/all?${params}`);
  if (!response.ok) throw new Error('Failed to fetch issues');
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch issues');
  return { issues: data.issues, total: data.total };
},

async getAllIssues(): Promise<Issue[]> {
  const { issues } = await this.getIssues();
  return issues;
},

async getIssuesByTeacher(teacherId: string): Promise<Issue[]> {
  const response = await fetch(`${API_BASE_URL}/api/teacher/issues/teacher/${teacherId}`);
  if (!response.ok) throw new Error('Failed to fetch issues');
  const data = await response.json();
  if (!data.success) throw new Error('Failed to fetch issues');
  return data.issues;
},

async getIssueById(id: string): Promise<Issue | null> {
  const response = await fetch(`${API_BASE_URL}/api/teacher/issues/${id}`);
  if (!response.ok) return null;
  const data = await response.json();
  if (!data.success) return null;
  return data.issue;
},

async updateIssueStatus(id: string, status: Issue['status'], adminRemarks?: string): Promise<Issue | null> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/issues/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, adminRemarks }),
  });
  if (!response.ok) throw new Error('Failed to update issue status');
  const data = await response.json();
  if (!data.success) throw new Error('Failed to update issue status');
  return data.issue;
},

async submitIssue(
  teacherId: string,
  cluster: string,
  category: Issue['category'],
  description: string
): Promise<{ issue: Issue; aiResponse?: AIResponse }> {
  const response = await fetch(`${API_BASE_URL}/api/teacher/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherId, cluster, category, description }),
  });
  if (!response.ok) throw new Error('Failed to submit issue');
  return response.json();
},

async deleteIssue(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/issues/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete issue');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete issue');
  }
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

  async getAllTrainingFeedback(): Promise<TrainingFeedback[]> {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/training-feedback`);
    if (!response.ok) throw new Error('Failed to fetch training feedback');
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch training feedback');
    return data.feedbacks;
  },
  
  async getTrainingFeedbackByModule(moduleId: string): Promise<TrainingFeedback[]> {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/training-feedback/module/${moduleId}`);
    if (!response.ok) throw new Error('Failed to fetch module feedback');
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch module feedback');
    return data.feedbacks;
  },
  
  async getTrainingFeedbackByTeacher(teacherId: string): Promise<TrainingFeedback[]> {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/training-feedback/teacher/${teacherId}`);
    if (!response.ok) throw new Error('Failed to fetch teacher feedback');
    const data = await response.json();
    if (!data.success) throw new Error('Failed to fetch teacher feedback');
    return data.feedbacks;
  },
};

export default api;