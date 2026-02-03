import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  competencyArea: string;
  difficultyLevel: string;
  estimatedDuration: string;
  contentType: 'video' | 'article' | 'interactive' | 'mixed';
  videoUrl?: string;
  articleContent?: string;
}

export interface TrainingAssignment {
  id: string;
  teacherId: string;
  moduleId: string;
  assignedBy: string;
  assignedReason: string;
  sourceIssueId?: string;
  status: TrainingStatus;
  progressPercentage: number;
  assignedDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  dueDate: Date;
  videoWatchTimeSeconds: number;
  videoCompleted: boolean;
  module?: TrainingModule;
  personalizedContent?: string;
}

interface TrainingContextType {
  trainings: TrainingAssignment[];
  isLoading: boolean;
  error: string | null;
  getTrainingById: (id: string) => TrainingAssignment | undefined;
  updateProgress: (trainingId: string, percentage: number) => Promise<void>;
  refreshTrainings: () => Promise<void>;
  notStartedCount: number;
  inProgressCount: number;
  completedCount: number;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

export function TrainingProvider({ children }: { children: ReactNode }) {
  const { teacher, isAuthenticated } = useAuth();
  const [trainings, setTrainings] = useState<TrainingAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && teacher?.id) {
      console.log('🎓 Fetching training assignments for teacher:', teacher.id);
      refreshTrainings();
    } else {
      setTrainings([]);
    }
  }, [isAuthenticated, teacher?.id]);

  const refreshTrainings = async () => {
    if (!teacher?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/teacher/training/${teacher.id}`);
      const data = await response.json();

      console.log('📡 Training API Response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch trainings');
      }

      if (data.success && data.trainings) {
        const parsedTrainings: TrainingAssignment[] = data.trainings.map((t: any) => ({
          id: t.id,
          teacherId: t.teacherId,
          moduleId: t.moduleId,
          assignedBy: t.assignedBy,
          assignedReason: t.assignedReason,
          sourceIssueId: t.sourceIssueId,
          status: t.status as TrainingStatus,
          progressPercentage: t.progressPercentage || 0,
          assignedDate: new Date(t.assignedDate),
          startedAt: t.startedAt ? new Date(t.startedAt) : undefined,
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
          dueDate: new Date(t.dueDate),
          videoWatchTimeSeconds: t.videoWatchTimeSeconds || 0,
          videoCompleted: t.videoCompleted || false,
          module: t.module ? {
            id: t.module.id,
            title: t.module.title,
            description: t.module.description,
            competencyArea: t.module.competencyArea,
            difficultyLevel: t.module.difficultyLevel,
            estimatedDuration: t.module.estimatedDuration,
            contentType: t.module.contentType,
            videoUrl: t.module.videoUrl,
            articleContent: t.module.articleContent,
          } : undefined,
          personalizedContent: t.personalizedContent,
        }));

        setTrainings(parsedTrainings);
        console.log(`✅ Loaded ${parsedTrainings.length} training assignments`);
      }
    } catch (err) {
      console.error('❌ Error fetching trainings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trainings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProgress = async (trainingId: string, percentage: number) => {
    try {
      const newStatus: TrainingStatus = 
        percentage === 0 ? 'not_started' :
        percentage >= 100 ? 'completed' : 'in_progress';

      const updatePayload: any = { 
        progress_percentage: percentage,
        status: newStatus
      };

      // Add timestamps based on status
      if (newStatus === 'in_progress') {
        const training = trainings.find(t => t.id === trainingId);
        if (training && !training.startedAt) {
          updatePayload.started_at = new Date().toISOString();
        }
      }
      
      if (newStatus === 'completed') {
        updatePayload.completed_at = new Date().toISOString();
      }

      const response = await fetch(`${API_URL}/api/teacher/training/${trainingId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) throw new Error('Failed to update progress');

      // Refresh to get latest data
      await refreshTrainings();
    } catch (err) {
      console.error('Error updating progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to update progress');
    }
  };

  const getTrainingById = (id: string) => trainings.find(t => t.id === id);

  const notStartedCount = trainings.filter(t => t.status === 'not_started').length;
  const inProgressCount = trainings.filter(t => t.status === 'in_progress').length;
  const completedCount = trainings.filter(t => t.status === 'completed').length;

  return (
    <TrainingContext.Provider
      value={{
        trainings,
        isLoading,
        error,
        getTrainingById,
        updateProgress,
        refreshTrainings,
        notStartedCount,
        inProgressCount,
        completedCount,
      }}
    >
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
}
