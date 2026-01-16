export interface Teacher {
    id: string;
    name: string;
    cluster: string;
  }
  export interface Issue {
    id?: number;
    teacher_id: string;
    issue: string;
    cluster: string;
    created_at?: string;
  }
  export interface AIAnalysis {
    gaps: string[];
    recommended_modules: number[];
    processing_time: number;
  }
  