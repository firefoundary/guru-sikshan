import { useState, useMemo, useEffect } from 'react';
import { MessageSquare, Star, Search, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { toast } from '@/hooks/use-toast';
import api, { TrainingFeedback } from '@/services/api';

interface FeedbackProps {
  onLogout: () => void;
}

export function FeedbackPage({ onLogout }: FeedbackProps) {
  const [modules, setModules] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<TrainingFeedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<TrainingFeedback | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [modulesData, feedbacksData] = await Promise.all([
          api.getTrainingModules(),
          api.getAllTrainingFeedback()
        ]);
        
        setModules(modulesData);
        setFeedbacks(feedbacksData);
        
        console.log(`Loaded ${modulesData.length} modules and ${feedbacksData.length} feedbacks`);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load training feedback',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      if (prev.includes(moduleId)) {
        return prev.filter(id => id !== moduleId);
      } else {
        return [...prev, moduleId];
      }
    });
  };

  // Get feedbacks for a specific module
  const getFeedbacksForModule = (moduleId: string) => {
    return feedbacks.filter(f => f.moduleId === moduleId);
  };

  // Get module stats
  const getModuleStats = (moduleId: string) => {
    const moduleFeedbacks = getFeedbacksForModule(moduleId);
    if (moduleFeedbacks.length === 0) return { count: 0, avgRating: 0 };

    const avgRating = moduleFeedbacks.reduce((sum, f) => sum + f.rating, 0) / moduleFeedbacks.length;
    return { count: moduleFeedbacks.length, avgRating };
  };

  // Filtered modules
  const filteredModules = useMemo(() => {
    if (!searchQuery) return modules;
    return modules.filter(module =>
      module.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [modules, searchQuery]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}
      />
    ));
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Training Feedback"
        subtitle="Teacher feedback organized by training modules"
        onLogout={onLogout}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Training Feedback"
      subtitle="Teacher feedback organized by training modules"
      onLogout={onLogout}
    >

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 border border-border rounded-xl bg-background text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Module Boxes */}
      <div className="space-y-4">
        {filteredModules.length === 0 ? (
          <div className="dashboard-card text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No modules found matching your search' : 'No training modules available'}
            </p>
          </div>
        ) : (
          filteredModules.map(module => {
            const moduleFeedbacks = getFeedbacksForModule(module.id);
            const stats = getModuleStats(module.id);
            const isExpanded = expandedModules.includes(module.id);

            return (
              <div key={module.id} className="dashboard-card p-0 overflow-hidden">
                {/* Module Header (Clickable) */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full bg-gradient-to-r from-primary/10 to-primary/5 p-6 hover:from-primary/15 hover:to-primary/10 transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-semibold text-foreground">
                          {module.title}
                        </h2>
                        {isExpanded ? (
                          <ChevronUp className="text-muted-foreground flex-shrink-0" size={20} />
                        ) : (
                          <ChevronDown className="text-muted-foreground flex-shrink-0" size={20} />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {module.competencyArea.replace(/_/g, ' ')} • {module.difficultyLevel}
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{stats.count}</p>
                        <p className="text-xs text-muted-foreground">Responses</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 mb-1 justify-center">
                          <Star className="fill-warning text-warning" size={18} />
                          <span className="text-2xl font-bold text-foreground">
                            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Avg Rating</p>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Feedback Items (Collapsable) */}
                {isExpanded && (
                  <div className="p-6 border-t border-border">
                    {moduleFeedbacks.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="mx-auto text-muted-foreground mb-2" size={32} />
                        <p className="text-sm text-muted-foreground">No feedback yet for this module</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {moduleFeedbacks.map(feedback => (
                          <div
                            key={feedback.id}
                            className="bg-muted/30 hover:bg-muted/50 p-4 rounded-lg cursor-pointer transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFeedback(feedback);
                            }}
                          >
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h3 className="font-medium text-foreground">
                                  {feedback.teacherName}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(feedback.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {renderStars(feedback.rating)}
                              </div>
                            </div>
                            {feedback.comment && (
                              <p className="text-sm text-foreground line-clamp-2">
                                {feedback.comment}
                              </p>
                            )}
                            {(feedback.needsAdditionalSupport || feedback.stillHasIssue) && (
                              <div className="flex gap-2 mt-2">
                                {feedback.needsAdditionalSupport && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-warning/20 text-warning">
                                    Needs Support
                                  </span>
                                )}
                                {feedback.stillHasIssue && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive">
                                    Has Issue
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {selectedFeedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedFeedback(null)}
        >
          <div
            className="dashboard-card max-w-2xl w-full max-h-[85vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {selectedFeedback.teacherName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {modules.find(m => m.id === selectedFeedback.moduleId)?.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-muted-foreground hover:text-foreground text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                {renderStars(selectedFeedback.rating)}
                <span className="text-sm text-muted-foreground ml-2">
                  {selectedFeedback.rating} out of 5
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-3 py-1 rounded-full ${
                  selectedFeedback.wasHelpful 
                    ? 'bg-success/10 text-success' 
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {selectedFeedback.wasHelpful ? 'Helpful' : 'Not Helpful'}
                </span>
              </div>
            </div>

            {selectedFeedback.comment && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-foreground mb-2">Feedback</h4>
                <p className="text-foreground bg-muted/30 p-4 rounded-lg">
                  {selectedFeedback.comment}
                </p>
              </div>
            )}

            {selectedFeedback.strengths.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-foreground mb-2">Strengths</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFeedback.strengths.map((s, i) => (
                    <span key={i} className="text-sm px-3 py-1 rounded-full bg-success/10 text-success">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedFeedback.improvements.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-foreground mb-2">Suggestions for Improvement</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFeedback.improvements.map((s, i) => (
                    <span key={i} className="text-sm px-3 py-1 rounded-full bg-warning/10 text-warning">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(selectedFeedback.stillHasIssue || selectedFeedback.needsAdditionalSupport) && (
              <div className="mb-6 p-4 bg-warning/10 rounded-lg border border-warning/20">
                <h4 className="text-sm font-medium text-foreground mb-2">Action Required</h4>
                <ul className="text-sm space-y-1">
                  {selectedFeedback.stillHasIssue && (
                    <li className="text-destructive">• Teacher still has the original issue</li>
                  )}
                  {selectedFeedback.needsAdditionalSupport && (
                    <li className="text-warning">• Teacher needs additional support</li>
                  )}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <button
                onClick={() => {
                  toast({ title: 'Scheduled', description: `Follow-up scheduled for ${selectedFeedback.teacherName}` });
                  setSelectedFeedback(null);
                }}
                className="btn-primary w-full py-3"
              >
                Schedule Follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default FeedbackPage;
