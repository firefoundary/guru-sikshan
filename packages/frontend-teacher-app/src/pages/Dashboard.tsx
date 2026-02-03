import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIssue } from '@/contexts/FeedbackContext';
import { useTraining } from '@/contexts/TrainingContext';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Clock, Eye, CheckCircle, MapPin } from 'lucide-react';

export default function Dashboard() {
  const { teacher } = useAuth();
  const { pendingCount, reviewedCount, resolvedCount, issues } = useIssue();
  const { trainings } = useTraining();
  const navigate = useNavigate();

  const recentIssues = issues.slice(0, 3);

  const stats = [
    {
      label: 'Pending',
      count: pendingCount,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Reviewed',
      count: reviewedCount, 
      icon: Eye,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Resolved',
      count: resolvedCount,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
  ];

  const getTrainingFromIssue = (issueId: string) => {
    return trainings.find(t => t.sourceIssueId === issueId);
  };

  const handleIssueClick = (issueId: string) => {
    const training = getTrainingFromIssue(issueId);
    if (training) {
      navigate(`/training/${training.id}`, {
        state: { from: '/dashboard' }
      });
    } else {
      navigate(`/issues/${issueId}`, { 
        state: { from: '/dashboard' }
      });
    }
  };

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, <span className="text-primary">{teacher?.name}</span>
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <MapPin className="w-4 h-4" />
            <span>{teacher?.cluster}</span>
          </div>
        </div>

        {/* Quick Action */}
        <Button 
          onClick={() => navigate('/report')} 
          className="w-full" 
          size="lg"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Report an Issue
        </Button>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <div className={`${stat.bgColor} ${stat.color} w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold">{stat.count}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/history')}
            >
              View All
            </Button>
          </div>

          {recentIssues.length > 0 ? (
            <div className="space-y-3">
              {recentIssues.map((issue) => (
                <Card 
                  key={issue.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleIssueClick(issue.id)} 
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1">
                          {issue.category.replace('_', ' ')} Issue
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {issue.description}
                        </p>
                        <div className="text-xs text-muted-foreground mt-2">
                          {issue.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                      {/* Show if training was assigned */}
                      {getTrainingFromIssue(issue.id) && (
                        <div className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">
                          Training Assigned
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-muted-foreground mb-2">No issues reported yet</div>
                <p className="text-sm text-muted-foreground">
                  Start by reporting your first issue
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
