import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type IssueCategory = 'academic' | 'infrastructure' | 'administrative' | 'safety' | 'technology' | 'other';
export type IssueStatus = 'pending' | 'reviewed' | 'resolved' | 'training_assigned';

export interface Issue {
  id: string;
  teacherId: string;
  cluster: string;
  category: IssueCategory;
  description: string;
  status: IssueStatus;
  createdAt: Date;
  updatedAt: Date;
  adminRemarks?: string;
  aiResponse?: {  
    suggestion: string;
    inferredGaps: string[];
    priority: string;
  };
}

// Backward compatibility alias
export type Feedback = Issue;

// ✅ NEW: Separate interface for submission result
export interface IssueSubmissionResult {
  success: boolean;
  issue?: any;
  aiResponse?: {
    suggestion: string;
    inferredGaps: string[];
    priority: string;
  };
  // ✅ Fields for "already assigned" scenario
  issue_deleted?: boolean;
  feedback_deleted?: boolean; // backward compat
  skipped_ai_call?: boolean;
  message?: string;
  reason?: string;
  assigned_module?: string;
  already_existed?: boolean;
}

// Backward compatibility alias
export type FeedbackSubmissionResult = IssueSubmissionResult;

interface IssueContextType {
  issues: Issue[];
  isLoading: boolean;
  submitIssue: (data: Omit<Issue, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'aiResponse'>) => Promise<IssueSubmissionResult>;
  getIssueById: (id: string) => Issue | undefined;
  refreshIssues: () => Promise<void>;
  pendingCount: number;
  reviewedCount: number;
  resolvedCount: number;
  error: string | null;
}

const IssueContext = createContext<IssueContextType | undefined>(undefined);

// ⚡ FIX: Use 127.0.0.1 to avoid Mac localhost issues
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

export function IssueProvider({ children }: { children: ReactNode }) {
  const { teacher, isAuthenticated } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch issues when teacher logs in
  useEffect(() => {
    if (isAuthenticated && teacher?.id) {
      console.log(`👤 Auth Detected for Teacher: ${teacher.id}`);
      refreshIssues();
    } else {
      console.log('👤 No Auth User detected yet...');
      setIssues([]);
    }
  }, [isAuthenticated, teacher?.id]);

  const refreshIssues = async () => {
    if (!teacher?.id) return;

    console.log(`🔄 Fetching issues from: ${API_URL}/api/teacher/issues/teacher/${teacher.id}`);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/teacher/issues/teacher/${teacher.id}`);
      console.log(`📡 Response Status: ${response.status}`);
      
      const data = await response.json();
      console.log('📦 Data received:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch issues');
      }

      if (data.success && data.issues) {
        const parsedIssues = data.issues.map((i: any) => ({
          id: i.id,
          teacherId: i.teacherId,
          cluster: i.cluster,
          category: i.category as IssueCategory,
          description: i.description,
          status: i.status as IssueStatus,
          createdAt: new Date(i.createdAt),
          updatedAt: new Date(i.updatedAt),
          adminRemarks: i.adminRemarks,
        }));
        
        setIssues(parsedIssues);
        console.log(`✅ Loaded ${parsedIssues.length} issues`);
      }
    } catch (err) {
      console.error('❌ Error fetching issues:', err);
      setError(err instanceof Error ? err.message : 'Failed to load issues');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ UPDATED: Return IssueSubmissionResult with all fields
  const submitIssue = async (
    data: Omit<Issue, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'aiResponse'>
  ): Promise<IssueSubmissionResult> => {
    if (!teacher?.id) {
      setError('You must be logged in to submit an issue');
      return { success: false };
    }
  
    console.log('🚀 Submitting Issue to:', `${API_URL}/api/teacher/issues`);
    setIsLoading(true);
    setError(null);
  
    try {
      const response = await fetch(`${API_URL}/api/teacher/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: data.teacherId,
          cluster: data.cluster,
          category: data.category,
          description: data.description,
        }),
      });
  
      const result = await response.json();
      console.log('📤 Submit Result:', result);
  
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit issue');
      }

      // ✅ Check if issue was deleted (training already assigned) - check both new and legacy keys
      if (result.issue_deleted === true || result.feedback_deleted === true || result.skipped_ai_call === true) {
        console.log('⚠️ Training already assigned - issue was deleted');
        setIsLoading(false);
        
        // Return the "already assigned" response
        return {
          success: true,
          issue_deleted: result.issue_deleted || result.feedback_deleted,
          feedback_deleted: result.feedback_deleted, // backward compat
          skipped_ai_call: result.skipped_ai_call,
          message: result.message,
          reason: result.reason,
          already_existed: result.already_existed,
        };
      }
  
      // ✅ Normal flow - new issue created (check both 'issue' and 'feedback' keys for backward compat)
      const issueData = result.issue || result.feedback;
      
      if (result.success && issueData) {
        const newIssue: Issue = {
          id: issueData.id,
          teacherId: issueData.teacherId || issueData.teacher_id,
          cluster: issueData.cluster,
          category: issueData.category as IssueCategory,
          description: issueData.description,
          status: issueData.status as IssueStatus,
          createdAt: new Date(issueData.createdAt || issueData.created_at),
          updatedAt: new Date(issueData.updatedAt || issueData.updated_at),
          adminRemarks: issueData.adminRemarks || issueData.admin_remarks,
          aiResponse: result.aiResponse, 
        };
  
        setIssues(prev => [newIssue, ...prev]);
        setIsLoading(false);
        
        return { 
          success: true, 
          issue: issueData,
          aiResponse: result.aiResponse 
        };
      }
  
      throw new Error('Invalid response from server');
      
    } catch (err) {
      console.error('❌ Error submitting issue:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit issue');
      setIsLoading(false);
      return { success: false };
    }
  };

  const getIssueById = (id: string) => issues.find(i => i.id === id);

  const pendingCount = issues.filter(i => i.status === 'pending').length;
  const reviewedCount = issues.filter(i => i.status === 'reviewed').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;

  return (
    <IssueContext.Provider value={{
      issues,
      isLoading,
      submitIssue,
      getIssueById,
      refreshIssues,
      pendingCount,
      reviewedCount,
      resolvedCount,
      error,
    }}>
      {children}
    </IssueContext.Provider>
  );
}

// Backward compatibility alias
export const FeedbackProvider = IssueProvider;

export function useIssue() {
  const context = useContext(IssueContext);
  if (context === undefined) {
    throw new Error('useIssue must be used within an IssueProvider');
  }
  return context;
}

// Backward compatibility alias
export const useFeedback = useIssue;
