import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback, IssueStatus } from '@/contexts/FeedbackContext';
import { useTraining } from '@/contexts/TrainingContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Filter, ChevronRight, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';

const statusFilters: { value: IssueStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' }
];

export default function History() {
  const { issues, isLoading } = useFeedback();
  const { trainings } = useTraining();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');

  const filteredFeedbacks = issues.filter(
    (f) => statusFilter === 'all' || f.status === statusFilter
  );

  const getTrainingFromFeedback = (feedbackId: string) => {
    return trainings.find(t => t.sourceIssueId === feedbackId);
  };

  const handleFeedbackClick = (feedbackId: string) => {
    const training = getTrainingFromFeedback(feedbackId);
    if (training) {
      navigate(`/training/${training.id}`,{
        state: {from: '/history'}
      });
    } else {
      navigate(`/feedback/${feedbackId}`,{
        state: {from: '/history'}
      });
    }
  };

  return (
    <MobileLayout>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />
              {t('history.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredFeedbacks.length} {filteredFeedbacks.length !== 1 ? t('history.issues') : t('history.issue')}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <Select 
            value={statusFilter} 
            onValueChange={(value) => setStatusFilter(value as IssueStatus | 'all')}
          >
            <SelectTrigger className="w-full">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('history.allStatus')}</SelectItem>
              <SelectItem value="pending">{t('status.pending')}</SelectItem>
              <SelectItem value="resolved">{t('status.resolved')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Feedback List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredFeedbacks.length > 0 ? (
          <div className="space-y-3">
            {filteredFeedbacks.map((feedback) => {
              const training = getTrainingFromFeedback(feedback.id);
              
              return (
                <Card
                  key={feedback.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleFeedbackClick(feedback.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <CategoryBadge category={feedback.category} />
                      <StatusBadge status={feedback.status} />
                    </div>

                    <p className="text-sm font-medium mb-2 line-clamp-2">
                      {feedback.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{feedback.cluster}</span>
                      <span>{format(feedback.createdAt, 'MMM d, yyyy')}</span>
                    </div>

                    {training && (
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                          <GraduationCap className="w-4 h-4" />
                          <span>{t('history.trainingAssigned')}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-medium mb-1">
                {statusFilter === 'all' ? t('history.noFeedback') : t('history.noMatching')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {statusFilter === 'all'
                  ? t('history.startReporting')
                  : t('history.tryFilter')}
              </p>
              {statusFilter === 'all' && (
                <Button onClick={() => navigate('/report')}>
                  {t('history.reportIssue')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
