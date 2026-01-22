import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

current_dir = Path(__file__).parent
dotenv_path = current_dir.parent.parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

class SupabaseDB:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY_PYTHON")  # CORRECTED
        
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file")
        
        self.client: Client = create_client(url, key)
    
    def get_teacher_by_id(self, teacher_id):
        """Fetch teacher profile from Supabase"""
        try:
            response = self.client.table('teachers').select('*').eq('id', teacher_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching teacher: {e}")
            return None
    
    def get_teachers_by_cluster(self, cluster_id):
        """Fetch all teachers in a cluster"""
        try:
            response = self.client.table('teachers').select('*').eq('cluster_id', cluster_id).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching cluster teachers: {e}")
            return []
    
    def get_teacher_assessments(self, teacher_id):
        """Fetch teacher's competency assessment scores"""
        try:
            response = self.client.table('teacher_assessments')\
                .select('*')\
                .eq('teacher_id', teacher_id)\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching assessments: {e}")
            return None
    
    def save_gap_analysis(self, teacher_id, gap_data):
        """Save ML-generated gap analysis"""
        try:
            data = {
                'teacher_id': teacher_id,
                'gap_areas': gap_data['gap_areas'],
                'priority_level': gap_data['priority'],
                'recommended_modules': gap_data['recommended_modules'],
                'cluster_assignment': gap_data.get('cluster_label')
            }
            response = self.client.table('competency_gaps').insert(data).execute()
            return response.data
        except Exception as e:
            print(f"Error saving gap analysis: {e}")
            return None
    
    def get_base_training_module(self, module_id):
        """Fetch base training content"""
        try:
            response = self.client.table('training_modules').select('*').eq('id', module_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching module: {e}")
            return None
    
    def save_personalized_training(self, teacher_id, module_id, personalized_content, metadata):
        """Save personalized training assignment"""
        try:
            data = {
                'teacher_id': teacher_id,
                'base_module_id': module_id,
                'personalized_content': personalized_content,
                'adaptation_metadata': metadata,
                'status': 'assigned',
                'completion_percentage': 0
            }
            response = self.client.table('personalized_training').insert(data).execute()
            return response.data
        except Exception as e:
            print(f"Error saving personalized training: {e}")
            return None

# Initialize global instance
db = SupabaseDB()
