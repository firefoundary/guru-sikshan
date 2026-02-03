import { useNavigate } from 'react-router-dom';
import { useTraining } from '@/contexts/TrainingContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Clock, CheckCircle, PlayCircle, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Training() {
  const { trainings, notStartedCount, inProgressCount, completedCount, isLoading } = useTraining();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const stats = [
    {
      label: t('training.new'),
      count: notStartedCount,
      icon: Clock,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    {
      label: t('training.active'),
      count: inProgressCount,
      icon: PlayCircle,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: t('training.done'),
      count: completedCount,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
  ];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const getDaysRemaining = (dueDate: Date) => {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="sticky top-0 bg-background border-b z-10 px-4 py-3">
            <h1 className="text-xl font-bold">{t('training.myTraining')}</h1>
          </div>

          {/* Loading State */}
          <div className="flex items-center justify-center flex-1">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-muted-foreground">{t('training.loadingTrainings')}</p>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col h-full pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b z-10 px-4 py-3">
          <h1 className="text-xl font-bold">{t('training.myTraining')}</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 p-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-3">
                <div className={cn("flex items-center justify-center w-8 h-8 rounded-full mx-auto mb-2", stat.bgColor)}>
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
                </div>
                <div className="text-2xl font-bold text-center">{stat.count}</div>
                <div className="text-xs text-muted-foreground text-center">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Training List with Tabs */}
        <div className="px-4 flex-1 overflow-auto">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="all">{t('training.all')}</TabsTrigger>
              <TabsTrigger value="not_started">{t('training.new')}</TabsTrigger>
              <TabsTrigger value="in_progress">{t('training.active')}</TabsTrigger>
              <TabsTrigger value="completed">{t('training.done')}</TabsTrigger>
            </TabsList>

            {['all', 'not_started', 'in_progress', 'completed'].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-3 pb-4">
                {trainings
                  .filter(t => tab === 'all' || t.status === tab)
                  .map((training) => {
                    const daysRemaining = getDaysRemaining(training.dueDate);
                    
                    return (
                      <Card
                        key={training.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => navigate(`/training/${training.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              {/* Training Module Title */}
                              <h3 className="font-semibold text-base mb-1">
                                {training.module?.title || t('training.unnamed')}
                              </h3>
                              
                              {/* Competency Badge */}
                              {training.module?.competencyArea && (
                                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 mb-2">
                                  {training.module.competencyArea.replace(/_/g, ' ')}
                                </span>
                              )}
                              
                              {/* Content Preview */}
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {training.personalizedContent 
                                  ? training.personalizedContent.substring(0, 120) + '...'
                                  : training.module?.description || t('training.noDescription')}
                              </p>
                            </div>
                            
                            <ChevronRight className="w-5 h-5 text-muted-foreground ml-2 flex-shrink-0" />
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1 mb-3">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{t('training.progress')}</span>
                              <span className="font-semibold">{training.progressPercentage}%</span>
                            </div>
                            <Progress value={training.progressPercentage} className="h-2" />
                          </div>

                          {/* Footer: Status Badge and Due Date */}
                          <div className="flex items-center justify-between">
                            <TrainingStatusBadge status={training.status} />
                            
                            {/* Due Date with Icon */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {training.status === 'completed' && training.completedAt ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {t('training.completedOn')} {formatDate(training.completedAt)}
                                </span>
                              ) : daysRemaining < 0 ? (
                                <span className="text-red-600 dark:text-red-400">
                                  {t('training.overdueBy')} {Math.abs(daysRemaining)} {t('training.days')}
                                </span>
                              ) : daysRemaining === 0 ? (
                                <span className="text-orange-600 dark:text-orange-400">
                                  {t('training.dueToday')}
                                </span>
                              ) : (
                                <span>{t('training.dueIn')} {daysRemaining} {t('training.days')}</span>
                              )}
                            </div>
                          </div>

                          {/* Optional: Difficulty Level */}
                          {training.module?.difficultyLevel && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {t('training.difficulty')}: <span className="capitalize">{training.module.difficultyLevel}</span>
                              {training.module.estimatedDuration && (
                                <> • {t('training.duration')}: {training.module.estimatedDuration}</>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                {/* Empty State */}
                {trainings.filter(t => tab === 'all' || t.status === tab).length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">{t('training.noTrainings')}</p>
                    {tab !== 'all' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('training.trySwitching')}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </MobileLayout>
  );
}

function TrainingStatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  
  const config = {
    not_started: { 
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', 
      label: t('training.notStarted')
    },
    in_progress: { 
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', 
      label: t('training.inProgress')
    },
    completed: { 
      color: 'bg-emerald-100 text-emerald-700 dark:text-emerald-900/30 dark:text-emerald-400', 
      label: t('training.completed')
    },
    skipped: {
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      label: 'Skipped'
    }
  }[status] || { color: 'bg-muted text-muted-foreground', label: status };

  return (
    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", config.color)}>
      {config.label}
    </span>
  );
}
