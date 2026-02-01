import { useState, useEffect } from 'react';
import { Users, BookOpen, MessageSquare, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { IssueTable } from '@/components/IssueTable';
import { api, type DashboardStats, type Feedback } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentIssues, setRecentIssues] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, feedbackResult] = await Promise.all([
          api.getDashboardStats(),
          api.getFeedback(undefined, undefined, 3, 0), // ✅ Use getFeedbackPage
        ]);
        setStats(statsData);
        setRecentIssues(feedbackResult.feedbacks); // ✅ Extract feedbacks
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  

  const handleStatusChange = async (id: string, status: Feedback['status']) => {
    try {
      await api.updateFeedbackStatus(id, status);
      setRecentIssues(prev => 
        prev.map(issue => 
          issue.id === id ? { ...issue, status } : issue
        )
      );
      toast({
        title: 'Status Updated',
        description: 'Issue status has been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update issue status',
        variant: 'destructive',
      });
    }
  };

  // Calculate display stats from the backend stats structure
  const displayStats = stats ? {
    totalTeachers: stats.total, // Using total feedback as proxy - would need separate endpoint
    activeModules: stats.byStatus.resolved + stats.byStatus.inReview,
    openIssues: stats.byStatus.pending,
    completionRate: stats.total > 0 ? Math.round((stats.byStatus.resolved / stats.total) * 100) : 0,
  } : null;

  return (
    <DashboardLayout 
      title="Dashboard" 
      subtitle="Overview of DIET training activities"
      onLogout={onLogout}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="dashboard-card">
              <div className="space-y-3">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-8 w-16" />
                <div className="skeleton h-3 w-32" />
              </div>
            </div>
          ))
        ) : displayStats && (
          <>
            <StatCard
              title="Total Feedback"
              value={stats?.total.toLocaleString() || '0'}
              trend={0}
              icon={Users}
              iconColor="text-primary"
              iconBgColor="bg-primary/10"
            />
            <StatCard
              title="Pending Issues"
              value={displayStats.openIssues}
              trend={0}
              icon={BookOpen}
              iconColor="text-warning"
              iconBgColor="bg-warning/10"
            />
            <StatCard
              title="In Review"
              value={stats?.byStatus.inReview || 0}
              trend={0}
              icon={MessageSquare}
              iconColor="text-primary"
              iconBgColor="bg-primary/10"
            />
            <StatCard
              title="Resolved"
              value={stats?.byStatus.resolved || 0}
              trend={0}
              icon={TrendingUp}
              iconColor="text-success"
              iconBgColor="bg-success/10"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Link 
          to="/modules" 
          className="dashboard-card hover:shadow-card-hover transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Create New Module</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload training content for teachers
              </p>
            </div>
            <ArrowRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link 
          to="/teachers" 
          className="dashboard-card hover:shadow-card-hover transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Manage Teachers</h3>
              <p className="text-sm text-muted-foreground mt-1">
                View and edit teacher records
              </p>
            </div>
            <ArrowRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link 
          to="/feedback" 
          className="dashboard-card hover:shadow-card-hover transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">View All Feedback</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Review teacher submissions
              </p>
            </div>
            <ArrowRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>

      {/* Recent Issues */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Feedback Issues</h2>
          <Link 
            to="/feedback" 
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        
        <IssueTable 
          issues={recentIssues} 
          loading={loading}
          onStatusChange={handleStatusChange}
        />
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
