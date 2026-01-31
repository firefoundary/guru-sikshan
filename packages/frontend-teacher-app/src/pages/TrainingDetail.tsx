import { useParams, useNavigate, useLocation } from 'react-router-dom'; // ✅ ADD useLocation
import { useTraining } from '@/contexts/TrainingContext';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  CheckCircle2,
  ArrowLeft,
  MessageSquare,
  Clock,
  Calendar,
  Award,
  PlayCircle
} from 'lucide-react';
import { useState } from 'react';

export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation(); // ✅ ADD THIS
  const { getTrainingById, updateProgress, isLoading } = useTraining();
  const [localProgress, setLocalProgress] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const training = getTrainingById(id!);

  // ✅ Get the "from" location from navigation state
  const fromPage = location.state?.from || '/training'; // Default to /training if no state

  // Initialize local progress from training data
  if (training && localProgress === 0 && training.progressPercentage > 0) {
    setLocalProgress(training.progressPercentage);
  }

  const handleProgressChange = async (value: number[]) => {
    const newProgress = value[0];
    setLocalProgress(newProgress);
  };

  const handleProgressCommit = async () => {
    if (!training) return;
    setIsUpdating(true);
    try {
      await updateProgress(training.id, localProgress);
    } finally {
      setIsUpdating(false);
    }
  };

  const markComplete = async () => {
    if (!training) return;
    setIsUpdating(true);
    try {
      setLocalProgress(100);
      await updateProgress(training.id, 100);
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ NEW: Smart back navigation
  const handleBack = () => {
    if (fromPage === '/dashboard' || fromPage === '/history') {
      navigate(fromPage); // Go to the page we came from
    } else {
      navigate('/training'); // Default fallback
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const getDaysRemaining = (dueDate: Date) => {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (isLoading || !training) {
    return (
      <MobileLayout>
        <div className="p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack} // ✅ UPDATED
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                {!training ? 'Training not found' : 'Loading...'}
              </p>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  const currentProgress = localProgress || training.progressPercentage;
  const daysRemaining = getDaysRemaining(training.dueDate);

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack} // ✅ UPDATED
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">
            {training.module?.title || 'Training Details'}
          </h1>
        </div>

        {/* Content */}
        {/* Status and Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Your Progress</span>
              <Badge className={getStatusColor(training.status)}>
                {training.status === 'not_started' && 'Not Started'}
                {training.status === 'in_progress' && 'In Progress'}
                {training.status === 'completed' && 'Completed'}
                {training.status === 'skipped' && 'Skipped'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium">{currentProgress}%</span>
              </div>
              <Progress value={currentProgress} className="h-2" />
            </div>

            {/* Progress Slider */}
            {training.status !== 'completed' && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Update your progress:
                </label>
                <Slider
                  value={[localProgress]}
                  onValueChange={handleProgressChange}
                  onValueCommit={handleProgressCommit}
                  max={100}
                  step={5}
                  className="w-full"
                />
                {isUpdating && (
                  <p className="text-xs text-muted-foreground">Saving...</p>
                )}
              </div>
            )}

            {/* Quick Actions */}
            {training.status !== 'completed' && (
              <Button 
                onClick={markComplete} 
                className="w-full"
                disabled={isUpdating}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark as Complete
              </Button>
            )}

            {training.status === 'completed' && training.completedAt && (
              <div className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed on {formatDate(training.completedAt)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Training Content Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Training Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Show Personalized Content if available, otherwise module content */}
            {training.personalizedContent ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {training.personalizedContent}
                </div>
              </div>
            ) : training.module?.articleContent ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {training.module.articleContent}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {training.module?.description || 'No content available'}
              </p>
            )}

            {/* Video Player if video URL exists */}
            {training.module?.videoUrl && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => window.open(training.module?.videoUrl, '_blank')}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Watch Training Video
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Module Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-5 h-5" />
              Training Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {/* Competency Area */}
            {training.module?.competencyArea && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Competency Area:</span>
                <span className="font-medium">
                  {training.module.competencyArea.replace(/_/g, ' ')}
                </span>
              </div>
            )}

            {/* Difficulty Level */}
            {training.module?.difficultyLevel && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Difficulty:</span>
                <Badge variant="outline">
                  {training.module.difficultyLevel}
                </Badge>
              </div>
            )}

            {/* Estimated Duration */}
            {training.module?.estimatedDuration && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Duration:
                </span>
                <span className="font-medium">{training.module.estimatedDuration}</span>
              </div>
            )}

            {/* Assigned Date */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Assigned on:
              </span>
              <span className="font-medium">{formatDate(training.assignedDate)}</span>
            </div>

            {/* Due Date */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Due date:</span>
              <span className={`font-medium ${daysRemaining < 0 ? 'text-destructive' : ''}`}>
                {formatDate(training.dueDate)}
                {daysRemaining < 0 && ` (${Math.abs(daysRemaining)} days overdue)`}
                {daysRemaining === 0 && ' (Due today)'}
                {daysRemaining > 0 && ` (${daysRemaining} days remaining)`}
              </span>
            </div>

            {/* Assigned Reason */}
            {training.assignedReason && (
              <div className="pt-3 border-t">
                <p className="text-muted-foreground mb-1">Why this training?</p>
                <p className="text-sm">{training.assignedReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/training/${training.id}/feedback`)}
          disabled={training.status !== 'completed'}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {training.status === 'completed'
            ? 'Share Feedback on Training'
            : 'Complete training to provide feedback'}
        </Button>
      </div>
    </MobileLayout>
  );
}
