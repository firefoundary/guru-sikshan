import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Save, 
  X, 
  Upload as UploadIcon,
  ChevronRight,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { api, type TrainingModule } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface UploadModulesProps {
  onLogout: () => void;
}

const competencyAreas = [
  { value: 'classroom_management', label: 'Classroom Management' },
  { value: 'content_knowledge', label: 'Content Knowledge' },
  { value: 'pedagogy', label: 'Pedagogy' },
  { value: 'technology_usage', label: 'Technology Usage' },
  { value: 'student_engagement', label: 'Student Engagement' },
] as const;

const difficultyLevels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

const targetClusters = [
  'All Clusters',
  'North Delhi',
  'South Delhi',
  'East Delhi',
  'West Delhi',
  'Central Delhi',
  'Urban Clusters',
  'Rural Clusters',
  'Primary Schools',
  'Secondary Schools',
  'Senior Secondary',
];

type ModuleFormData = {
  title: string;
  description: string;
  competencyArea: string;
  difficultyLevel: TrainingModule['difficultyLevel'];
  targetClusters: string[];
  fullContent: string;
  contentType: TrainingModule['contentType'];
};

const initialFormData: ModuleFormData = {
  title: '',
  description: '',
  competencyArea: 'classroom_management',
  difficultyLevel: 'beginner',
  targetClusters: ['All Clusters'],
  fullContent: '',
  contentType: 'article',
};

export function UploadModules({ onLogout }: UploadModulesProps) {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<ModuleFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showPreview, setShowPreview] = useState(true);

  // Fetch modules
  useEffect(() => {
    async function fetchModules() {
      try {
        const data = await api.getTrainingModules();
        setModules(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load modules',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchModules();
  }, []);

  // Auto-save debounce (disabled for now since backend doesn't support it)
  const autoSave = useCallback(async () => {
    if (!editing || !formData.title) return;
    // Auto-save disabled - backend endpoint not available
    setSaveStatus('idle');
  }, [editing, formData]);

  useEffect(() => {
    if (editing && formData.title) {
      const timeout = setTimeout(autoSave, 2000);
      return () => clearTimeout(timeout);
    }
  }, [formData, editing, autoSave]);

  const handleEdit = (module: TrainingModule) => {
    setEditing(module.id);
    setFormData({
      title: module.title,
      description: module.description || '',
      competencyArea: module.competencyArea,
      difficultyLevel: module.difficultyLevel,
      targetClusters: module.targetClusters || ['All Clusters'],
      fullContent: module.fullContent || module.articleContent || '',
      contentType: module.contentType,
    });
  };

  const handleCreate = () => {
    setEditing('new');
    setFormData(initialFormData);
  };

  const handleCancel = () => {
    setEditing(null);
    setFormData(initialFormData);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Module title is required',
        variant: 'destructive',
      });
      return;
    }
  
    setSaving(true);
    try {
      if (editing === 'new') {
        const newModule = await api.createModule(formData);
        setModules(prev => [newModule, ...prev]);
        toast({
          title: 'Module Created',
          description: 'New training module has been created successfully',
        });
      } else if (editing) {
        const updatedModule = await api.updateModule(editing, formData);
        setModules(prev =>
          prev.map(m => m.id === editing ? updatedModule : m)
        );
        toast({
          title: 'Module Updated',
          description: 'Training module has been saved successfully',
        });
      }
      handleCancel();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: `Failed to save module: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this module? This action cannot be undone.')) return;
    
    try {
      await api.deleteModule(id);
      setModules(prev => prev.filter(m => m.id !== id));
      toast({
        title: 'Module Deleted',
        description: 'Training module has been removed successfully',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: `Failed to delete module: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };
  

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFormData(prev => ({ ...prev, fullContent: content }));
        toast({
          title: 'File Imported',
          description: `${file.name} content has been loaded`,
        });
      };
      reader.readAsText(file);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please upload a .txt file',
        variant: 'destructive',
      });
    }
  };

  // Word and character count
  const wordCount = formData.fullContent.trim().split(/\s+/).filter(Boolean).length;
  const charCount = formData.fullContent.length;

  // Render markdown preview (simple version)
  const renderPreview = (content: string) => {
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-2xl font-bold mb-4">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-semibold mb-3 mt-6">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-medium mb-2 mt-4">{line.slice(4)}</h3>;
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="ml-4">{line.slice(2)}</li>;
        }
        if (line.trim() === '') {
          return <br key={i} />;
        }
        return <p key={i} className="mb-2">{line}</p>;
      });
  };

  // Editor View
  if (editing) {
    return (
      <DashboardLayout 
        title={editing === 'new' ? 'Create Module' : 'Edit Module'}
        subtitle="Training module content editor"
        onLogout={onLogout}
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button onClick={handleCancel} className="hover:text-foreground">Modules</button>
          <ChevronRight size={16} />
          <span className="text-foreground">{editing === 'new' ? 'New Module' : formData.title || 'Untitled'}</span>
        </nav>

        {/* Save Status Indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === 'saving' && (
              <>
                <span className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                <span className="text-muted-foreground">Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle size={16} className="text-success" />
                <span className="text-success">All changes saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle size={16} className="text-destructive" />
                <span className="text-destructive">Error saving</span>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleCancel} className="btn-secondary">
              <X size={18} />
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Module'}
            </button>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Editor Column */}
          <div className="space-y-6">
            {/* Basic Info Card */}
            <div className="dashboard-card">
              <h3 className="font-semibold text-foreground mb-4">Module Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter module title"
                    className="input-field mt-1"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the module"
                    className="input-field mt-1 min-h-[80px] resize-none"
                    maxLength={500}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Competency Area</label>
                    <select
                      value={formData.competencyArea}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        competencyArea: e.target.value 
                      }))}
                      className="input-field mt-1"
                    >
                      {competencyAreas.map(area => (
                        <option key={area.value} value={area.value}>{area.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Difficulty</label>
                    <select
                      value={formData.difficultyLevel}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        difficultyLevel: e.target.value as TrainingModule['difficultyLevel'] 
                      }))}
                      className="input-field mt-1"
                    >
                      {difficultyLevels.map(level => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Target Cluster</label>
                    <select
                      value={formData.targetClusters[0] || 'All Clusters'}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetClusters: [e.target.value] }))}
                      className="input-field mt-1"
                    >
                      {targetClusters.map(cluster => (
                        <option key={cluster} value={cluster}>{cluster}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Content Type</label>
                    <select
                      value={formData.contentType}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        contentType: e.target.value as TrainingModule['contentType'] 
                      }))}
                      className="input-field mt-1"
                    >
                      <option value="article">Article</option>
                      <option value="video">Video</option>
                      <option value="interactive">Interactive</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Editor Card */}
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Module Content</h3>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    {charCount.toLocaleString()} chars | {wordCount.toLocaleString()} words
                  </span>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-sm text-primary hover:underline hidden lg:block"
                  >
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-border rounded-lg p-4 mb-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
              >
                <UploadIcon size={24} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop a .txt file here to import content
                </p>
              </div>

              {/* Content Textarea */}
              <textarea
                value={formData.fullContent}
                onChange={(e) => setFormData(prev => ({ ...prev, fullContent: e.target.value }))}
                placeholder="# Module Title

## Introduction

Write your module content here using Markdown syntax...

## Section 1

- Point 1
- Point 2

## Conclusion

Summary of the module content."
                className="input-field min-h-[400px] font-mono text-sm resize-y"
                style={{ tabSize: 2 }}
              />
              
              <p className="text-xs text-muted-foreground mt-2">
                Supports Markdown: # Headings, ## Subheadings, - Lists, **bold**, *italic*
              </p>
            </div>
          </div>

          {/* Preview Column */}
          {showPreview && (
            <div className="dashboard-card lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] overflow-auto">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                <Eye size={18} className="text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Preview</h3>
              </div>

              {formData.fullContent ? (
                <div className="prose prose-sm max-w-none text-foreground">
                  {renderPreview(formData.fullContent)}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Start typing to see preview</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Module List View
  return (
    <DashboardLayout 
      title="Training Modules" 
      subtitle="Create and manage DIET training content"
      onLogout={onLogout}
    >
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div>
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{modules.length}</span> training modules
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={18} />
          Create Module
        </button>
      </div>

      {/* Modules Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="dashboard-card">
              <div className="space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Modules Yet</h3>
          <p className="text-muted-foreground mb-4">Create your first training module to get started</p>
          <button onClick={handleCreate} className="btn-primary">
            <Plus size={18} />
            Create Module
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div key={module.id} className="dashboard-card group">
              <div className="flex items-start justify-between mb-3">
                <span className={`badge ${
                  module.contentType === 'video' ? 'badge-primary' :
                  module.contentType === 'article' ? 'badge-success' : 'badge-warning'
                } capitalize`}>
                  {module.contentType}
                </span>
                <span className={`badge ${
                  module.difficultyLevel === 'beginner' ? 'badge-success' :
                  module.difficultyLevel === 'intermediate' ? 'badge-warning' : 'badge-destructive'
                } capitalize`}>
                  {module.difficultyLevel}
                </span>
              </div>

              <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{module.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{module.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs px-2 py-1 bg-accent rounded-full text-accent-foreground">
                  {competencyAreas.find(a => a.value === module.competencyArea)?.label}
                </span>
                {module.targetClusters?.[0] && (
                  <span className="text-xs px-2 py-1 bg-accent rounded-full text-accent-foreground">
                    {module.targetClusters[0]}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>{module.completionCount?.toLocaleString() || 0} completions</span>
                <span>{module.averageRating?.toFixed(1) || 0} rating</span>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <button 
                  onClick={() => handleEdit(module)}
                  className="btn-secondary flex-1 py-2"
                >
                  <Edit3 size={16} />
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(module.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  aria-label="Delete module"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

export default UploadModules;
