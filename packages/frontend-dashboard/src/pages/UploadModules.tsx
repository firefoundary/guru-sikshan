import { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, Eye, Save, X, Upload as UploadIcon,
  ChevronRight, FileText, CheckCircle, AlertCircle
} from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { api, type TrainingModule } from '@/services/api';
import { toast } from '@/hooks/use-toast';

// ==================== TYPES ====================

interface UploadModulesProps {
  onLogout: () => void;
}

type ModuleFormData = {
  title: string;
  description: string;
  competencyArea: string;
  difficultyLevel: TrainingModule['difficultyLevel'];
  targetClusters: string[];
  fullContent: string;
  contentType: TrainingModule['contentType'];
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ==================== CONSTANTS ====================

const COMPETENCY_AREAS = [
  { value: 'classroom_management', label: 'Classroom Management' },
  { value: 'content_knowledge', label: 'Content Knowledge' },
  { value: 'pedagogy', label: 'Pedagogy' },
  { value: 'technology_usage', label: 'Technology Usage' },
  { value: 'student_engagement', label: 'Student Engagement' },
] as const;

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

const TARGET_CLUSTERS = [
  'All Clusters', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi',
  'Central Delhi', 'Urban Clusters', 'Rural Clusters', 'Primary Schools',
  'Secondary Schools', 'Senior Secondary',
];

const INITIAL_FORM_DATA: ModuleFormData = {
  title: '',
  description: '',
  competencyArea: 'classroom_management',
  difficultyLevel: 'beginner',
  targetClusters: ['All Clusters'],
  fullContent: '',
  contentType: 'article',
};

const CONTENT_PLACEHOLDER = `# Module Title

## Introduction

Write your module content here using Markdown syntax...

## Section 1

- Point 1
- Point 2

## Conclusion

Summary of the module content.`;

// ==================== MAIN COMPONENT ====================

export function UploadModules({ onLogout }: UploadModulesProps) {
  // State Management
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<ModuleFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showPreview, setShowPreview] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Computed Values
  const isCreating = editing === 'new';
  const currentModule = !isCreating ? modules.find(m => m.id === editing) : null;
  const wordCount = formData.fullContent.trim().split(/\s+/).filter(Boolean).length;
  const charCount = formData.fullContent.length;

  // ==================== EFFECTS ====================

  useEffect(() => {
    fetchModulesData();
  }, []);

  // ==================== DATA FETCHING ====================

  const fetchModulesData = async () => {
    try {
      const [modulesData, ragStatus] = await Promise.all([
        api.getTrainingModules(),
        api.getModulesRagStatus()
      ]);
      
      const modulesWithRag = modulesData.map(module => ({
        ...module,
        ragStatus: ragStatus.modules.find(r => r.id === module.id)
      }));
      
      setModules(modulesWithRag);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load modules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== FORM HANDLERS ====================

  const handleCreate = () => {
    setEditing('new');
    setFormData(INITIAL_FORM_DATA);
    setPdfFile(null);
  };

  const handleEdit = (module: TrainingModule) => {
    setEditing(module.id);
    setFormData({
      title: module.title,
      description: module.description || '',
      competencyArea: 'classroom_management',
      difficultyLevel: 'beginner',
      targetClusters: ['All Clusters'],
      fullContent: module.fullContent || module.articleContent || '',
      contentType: module.contentType,
    });
    setPdfFile(null);
  };

  const handleCancel = () => {
    setEditing(null);
    setFormData(INITIAL_FORM_DATA);
    setSaveStatus('idle');
    setPdfFile(null);
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
    setSaveStatus('saving');

    try {
      if (isCreating) {
        const newModule = await api.createModule(formData);
        setModules(prev => [newModule, ...prev]);
        
        toast({
          title: 'Module Created',
          description: 'Training module created successfully',
        });

        if (pdfFile) {
          await uploadPdfForModule(newModule);
        }
      } else if (editing) {
        const updatedModule = await api.updateModule(editing, formData);
        setModules(prev => prev.map(m => m.id === editing ? updatedModule : m));
        
        toast({
          title: 'Module Updated',
          description: 'Training module updated successfully',
        });
      }
      
      setSaveStatus('saved');
      handleCancel();
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
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
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.deleteModule(id);
      setModules(prev => prev.filter(m => m.id !== id));
      toast({
        title: 'Module Deleted',
        description: 'Training module removed successfully',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete module',
        variant: 'destructive',
      });
    }
  };

  // ==================== PDF UPLOAD HANDLERS ====================

  const uploadPdfForModule = async (module: TrainingModule) => {
    if (!pdfFile) return;

    setUploading(true);
    try {
      const result = await api.uploadPdfForModule(
        pdfFile,
        module.id,
        module.title,
        module.competencyArea
      );

      toast({
        title: 'PDF Uploaded',
        description: `Successfully processed ${result.chunks} chunks`,
      });

      await fetchModulesData();
    } catch (error) {
      console.error('PDF upload error:', error);
      toast({
        title: 'PDF Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload PDF',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePdfUpload = async (moduleId: string) => {
    if (!pdfFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a PDF file',
        variant: 'destructive',
      });
      return;
    }

    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    await uploadPdfForModule(module);
    setPdfFile(null);
  };

  // ==================== RENDER HELPERS ====================

  const renderPreview = (content: string) => {
    return content.split('\n').map((line, i) => {
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

  const renderSaveStatus = () => {
    if (saveStatus === 'saving') {
      return (
        <>
          <span className="w-2 h-2 bg-warning rounded-full animate-pulse" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <>
          <CheckCircle size={16} className="text-success" />
          <span className="text-success">All changes saved</span>
        </>
      );
    }
    if (saveStatus === 'error') {
      return (
        <>
          <AlertCircle size={16} className="text-destructive" />
          <span className="text-destructive">Error saving</span>
        </>
      );
    }
    return null;
  };

  const renderPdfStatus = () => {
    const hasRAG = (currentModule as any)?.ragStatus?.hasRAG;
    
    if (isCreating) return null;
    
    if (hasRAG) {
      return (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle size={16} />
            <span className="font-medium">PDF Already Uploaded</span>
          </div>
          {(currentModule as any).ragStatus.lastUpload && (
            <p className="text-xs text-muted-foreground mt-2">
              Last upload: {new Date((currentModule as any).ragStatus.lastUpload).toLocaleString()}
            </p>
          )}
          {(currentModule as any).ragStatus.pdfPath && (
            <p className="text-xs text-muted-foreground mt-1">
              File: {(currentModule as any).ragStatus.pdfPath.split('/').pop()}
            </p>
          )}
        </div>
      );
    }
    
    return (
      <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <AlertCircle size={14} />
          No PDF uploaded for this module
        </p>
      </div>
    );
  };

  // ==================== RENDER: EDITOR VIEW ====================

  if (editing) {
    return (
      <DashboardLayout 
        title={isCreating ? 'Create Module' : 'Edit Module'}
        subtitle="Training module content editor"
        onLogout={onLogout}
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button onClick={handleCancel} className="hover:text-foreground">
            Modules
          </button>
          <ChevronRight size={16} />
          <span className="text-foreground">
            {isCreating ? 'New Module' : formData.title || 'Untitled'}
          </span>
        </nav>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm">
            {renderSaveStatus()}
          </div>
          <div className="flex gap-3">
            <button onClick={handleCancel} className="btn-secondary">
              <X size={18} /> Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving || uploading} 
              className="btn-primary"
            >
              <Save size={18} />
              {saving ? 'Saving...' : uploading ? 'Saving & Uploading...' : 'Save Module'}
            </button>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Editor Column */}
          <div className="space-y-6">
            {/* Module Information */}
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

            {/* PDF Upload */}
            <div className="dashboard-card">
              <h3 className="font-semibold text-foreground mb-4">Training PDF</h3>
              
              {renderPdfStatus()}
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    {!isCreating && (currentModule as any)?.ragStatus?.hasRAG 
                      ? 'Upload Replacement PDF' 
                      : 'Upload PDF File'}
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="text-sm w-full"
                  />
                  {pdfFile && (
                    <p className="text-xs text-success mt-2 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Selected: {pdfFile.name}
                    </p>
                  )}
                </div>
                
                {isCreating ? (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-xs text-foreground">
                      PDF will be automatically uploaded when you save the module
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => handlePdfUpload(editing!)}
                    disabled={!pdfFile || uploading}
                    className="btn-primary w-full"
                  >
                    {uploading ? (
                      <>
                        <UploadIcon size={16} className="animate-pulse" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon size={16} />
                        {(currentModule as any)?.ragStatus?.hasRAG ? 'Replace PDF' : 'Upload PDF'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Content Editor */}
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

              <textarea
                value={formData.fullContent}
                onChange={(e) => setFormData(prev => ({ ...prev, fullContent: e.target.value }))}
                placeholder={CONTENT_PLACEHOLDER}
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

  // ==================== RENDER: MODULE LIST VIEW ====================

  return (
    <DashboardLayout 
      title="Training Modules" 
      subtitle="Create and manage DIET training content"
      onLogout={onLogout}
    >
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">{modules.length}</span> Training Modules
        </p>
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={18} /> Create Module
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dashboard-card">
              <div className="space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && modules.length === 0 && (
        <div className="dashboard-card text-center py-12">
          <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Modules Yet</h3>
          <p className="text-muted-foreground mb-4">Create your first training module to get started</p>
          <button onClick={handleCreate} className="btn-primary">
            <Plus size={18} /> Create Module
          </button>
        </div>
      )}

      {/* Modules Grid */}
      {!loading && modules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div key={module.id} className="dashboard-card">
              {/* Content Type Badge */}
              <div className="mb-3">
                <span className={`badge ${
                  module.contentType === 'video' ? 'badge-primary' :
                  module.contentType === 'article' ? 'badge-success' : 'badge-warning'
                } capitalize`}>
                  {module.contentType}
                </span>
              </div>

              {/* Module Info */}
              <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                {module.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {module.description}
              </p>

              {/* Stats */}
              <div className="text-sm text-muted-foreground mb-4">
                <span>{module.averageRating?.toFixed(1) || 0} rating</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(module)}
                  className="btn-secondary flex-1 py-2"
                >
                  <Edit3 size={16} /> Edit
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
