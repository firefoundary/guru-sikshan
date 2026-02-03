import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useIssue } from '@/contexts/FeedbackContext'; // Changed import
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { CategoryBadge } from '@/components/ui/category-badge';
import { ArrowLeft, MapPin, Calendar, Sparkles, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const { getIssueById } = useIssue(); 
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const issue = id ? getIssueById(id) : undefined; 

  useEffect(() => {
    if (id) fetchAIResponse(id);
  }, [id]);

  const fetchAIResponse = async (issueId: string) => {
    setLoadingAI(true);
    try {
      const response = await fetch(`${API_URL}/api/teacher/issues/${issueId}/ai-response`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.aiResponse) {
          setAiResponse(data.aiResponse);
          return; 
        }
      }
    } catch (error) {
      console.warn('API fetch failed, falling back to demo data:', error);
    } finally {
      setLoadingAI(false);
    }

    setAiResponse({
      assigned_module: "Classroom Management Basics",
      suggestion: "To address the noise levels, we recommend the standard classroom management module."
    });
  };

  if (!issue) return null; 

  return (
    <MobileLayout>
      <div className="px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{t('issue.details')}</h1>
        </div>

        {/* Status & Category */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <CategoryBadge category={issue.category} />
          <StatusBadge status={issue.status} />
        </div>

        {/* AI TRAINING CARD */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-blue-700 dark:text-blue-300">
              <Sparkles className="h-5 w-5" />
              {t('issue.recommendedTraining')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingAI ? (
              <div className="text-sm text-muted-foreground">{t('issue.findingModule')}</div>
            ) : (
              <>
                <p className="text-sm text-foreground font-medium">
                  {aiResponse?.assigned_module || "Classroom Management Basics"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('issue.basedOnReport')} ("{issue.description.substring(0, 30)}..."), {t('issue.recommendedTraining').toLowerCase()}.
                </p>
                
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => navigate(`/training/demo-module?issueId=${id}&feedbackId=${id}`)}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {t('issue.startTraining')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Original Description */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('issue.yourReport')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{issue.description}</p>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="text-xs text-muted-foreground flex gap-4 px-1">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {issue.cluster}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {format(new Date(issue.createdAt), 'MMM d, yyyy')}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
