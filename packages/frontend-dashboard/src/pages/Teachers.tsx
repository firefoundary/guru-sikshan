import { useState, useEffect } from 'react';
import { Plus, Download } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { TeacherTable } from '@/components/TeacherTable';
import { api, type Teacher } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface TeachersProps {
  onLogout: () => void;
}

export function Teachers({ onLogout }: TeachersProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeachers() {
      try {
        const data = await api.getTeachers();
        setTeachers(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load teachers',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTeachers();
  }, []);

  const handleEdit = (teacher: Teacher) => {
    toast({
      title: 'Edit Teacher',
      description: `Editing ${teacher.name}`,
    });
  };

  const handleDelete = async (teacher: Teacher) => {
    if (window.confirm(`Are you sure you want to delete ${teacher.name}?`)) {
      try {
        await api.deleteTeacher(teacher.id);
        setTeachers(prev => prev.filter(t => t.id !== teacher.id));
        toast({
          title: 'Teacher Deleted',
          description: `${teacher.name} has been removed`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete teacher',
          variant: 'destructive',
        });
      }
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Name', 'Email', 'Cluster', 'Employee ID', 'Created At'];
    const rows = teachers.map(t => [
      t.name, t.email, t.cluster, t.employeeId, t.createdAt
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teachers-report.csv';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Teachers report has been downloaded',
    });
  };

  return (
    <DashboardLayout 
      title="Teachers" 
      subtitle="Manage teacher records and track progress"
      onLogout={onLogout}
    >
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div>
          <p className="text-muted-foreground">
            Total of <span className="font-semibold text-foreground">{teachers.length}</span> registered teachers
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="btn-secondary">
            <Download size={18} />
            Export Report
          </button>
          <button className="btn-primary">
            <Plus size={18} />
            Add Teacher
          </button>
        </div>
      </div>

      {/* Teachers Table */}
      <TeacherTable 
        teachers={teachers} 
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </DashboardLayout>
  );
}

export default Teachers;
