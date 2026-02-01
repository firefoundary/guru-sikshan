import os
import sys
from dotenv import load_dotenv
from supabase_client import db
from llm_personalizer import personalizer

load_dotenv()

def test_gemini_personalization():
    print("Testing Gemini AI Personalization...")
    print("=" * 50)
    
    # Get teacher
    teacher = db.get_teacher_by_id('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    if not teacher:
        print("Teacher not found")
        return False
    
    print(f"Teacher: {teacher['name']}")
    
    # Get base module
    base_module_response = db.client.table('training_modules').select('*').eq('competency_area', 'classroom_management').limit(1).execute()
    
    if not base_module_response.data:
        print("No training module found")
        return False
    
    base_module = base_module_response.data[0]
    print(f"Base module: {base_module['title']}")
    
    # Teacher profile
    teacher_profile = {
        'name': teacher['name'],
        'subject': teacher['subject'],
        'experience': teacher.get('experience_years', 3),
        'gap_areas': ['classroom_management']
    }
    
    # Cluster context
    cluster_context = {
        'location': 'Tribal belt, Ranchi District, Jharkhand',
        'common_issues': 'student absenteeism, language barriers',
        'language': 'Hindi/Santali',
        'infrastructure': 'low'
    }
    
    print("\nCalling Gemini API...")
    print("This may take 10-15 seconds...")
    
    try:
        result = personalizer.personalize_training_module(
            base_module=base_module,
            teacher_profile=teacher_profile,
            cluster_context=cluster_context
        )
        
        if result.get('success'):
            print("\nGEMINI PERSONALIZATION SUCCESSFUL!")
            print("=" * 50)
            print("\nPersonalized Content Preview:")
            print(result['personalized_content'][:500] + "...")
            print("\nAdaptations Made:")
            for adaptation in result['adaptations_made']:
                print(f"  • {adaptation}")
            return True
        else:
            print(f"\nPersonalization failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_gemini_personalization()
    sys.exit(0 if success else 1)
