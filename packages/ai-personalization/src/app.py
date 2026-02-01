import os
import traceback
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))
print(f"DEBUG: Loaded API Key starting with: {os.getenv('GEMINI_API_KEY')[:5] if os.getenv('GEMINI_API_KEY') else 'NONE'}")

from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

if os.getenv('GEMINI_API_KEY'):
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

from ml_engine import analyzer
from llm_personalizer import personalizer
from feedback_analyzer import feedback_analyzer
from supabase_client import db

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'personalization-service'})

@app.route('/api/analyze-feedback/<teacher_id>', methods=['POST'])
def analyze_teacher_feedback(teacher_id):
    try:
        result = feedback_analyzer.analyze_teacher_feedback(teacher_id)
        return jsonify(result)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze-teacher-gaps', methods=['POST'])
def analyze_teacher_gaps():
    try:
        data = request.json
        result = analyzer.analyze_teacher_gap(data.get('teacher_id'))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/feedback-to-training', methods=['POST'])
def feedback_to_training():
    """Convert teacher feedback into personalized training assignment"""
    try:
        data = request.json
        teacher_id = data.get('teacher_id')
        feedback_id = data.get('feedback_id')
        
        if not teacher_id or not feedback_id:
            return jsonify({'error': 'teacher_id and feedback_id required'}), 400

        print(f"\n{'='*80}")
        print(f"🎯 FEEDBACK TO TRAINING WORKFLOW STARTED")
        print(f"{'='*80}")
        
        feedback_analysis = feedback_analyzer.analyze_teacher_feedback(teacher_id)
        inferred_gaps = feedback_analysis.get('inferred_gaps', [])
        gap_scores = feedback_analysis.get('gap_scores', {})
        
      
        print(f"\n🔍 SELECTING COMPETENCY GAP:")
        print(f"{'-'*80}")
        
        if not inferred_gaps and gap_scores:
            highest_gap = max(gap_scores.items(), key=lambda x: x[1])
            
            if highest_gap[1] >= 0.5:  
                inferred_gaps = [highest_gap[0]]
                print(f"✅ Using highest scoring gap: {highest_gap[0]} (score: {highest_gap[1]:.2f})")
            else:
                print(f"⚠️ All scores too low, defaulting to classroom_management")
                inferred_gaps = ['classroom_management']
        elif inferred_gaps:
            print(f"✅ Gaps detected: {', '.join(inferred_gaps)}")
        else:
            print(f"⚠️ No gaps detected, defaulting to classroom_management")
            inferred_gaps = ['classroom_management']

        selected_competency = inferred_gaps[0]
        print(f"🎯 SELECTED COMPETENCY: {selected_competency}")
        print(f"{'-'*80}")

        teacher = db.get_teacher_by_id(teacher_id)
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404

        cluster_id = teacher.get('cluster_id') or teacher.get('cluster')
        cluster_context = {
            'location': 'Rural India',
            'common_issues': 'general challenges',
            'language': 'Hindi'
        }

        try:
            module_response = db.client.table('training_modules')\
                .select('*')\
                .eq('competency_area', selected_competency)\
                .limit(1)\
                .execute()
            
            if module_response.data:
                base_module = module_response.data[0]
                print(f"Found module: {base_module['title']}")
            else:
                print(f"⚠️ No module found for {selected_competency}, creating default...")
                default_module = {
                    'title': f'{selected_competency.replace("_", " ").title()} Training',
                    'description': f'Personalized training for {selected_competency}',
                    'competency_area': selected_competency,
                    'content_type': 'article',
                    'estimated_duration': '10-15 minutes'
                }
                
                created = db.client.table('training_modules').insert(default_module).execute()
                base_module = created.data[0]
                
        except Exception as e:
            print(f"Module fetch error: {e}")
            return jsonify({'error': 'Could not find training module'}), 500

        print(f"\nChecking for existing training on competency: {selected_competency}")
        
        existing_check = db.client.table('teacher_training_assignments')\
            .select('id, status, progress_percentage, module_id, completed_at')\
            .eq('teacher_id', teacher_id)\
            .execute()
        
        existing_for_competency = None
        if existing_check.data:
            for assignment in existing_check.data:
                module_check = db.client.table('training_modules')\
                    .select('competency_area')\
                    .eq('id', assignment['module_id'])\
                    .single()\
                    .execute()
                
                if module_check.data and module_check.data['competency_area'] == selected_competency:
                    existing_for_competency = assignment
                    break
        
        if existing_for_competency:
            status = existing_for_competency['status']
            assignment_id = existing_for_competency['id']
            
            print(f"Training already exists for {selected_competency}")
            print(f"   Assignment ID: {assignment_id}")
            print(f"   Status: {status}")
            print(f"   Progress: {existing_for_competency['progress_percentage']}%")
            
            if status == 'completed':
                print(f"Training already COMPLETED - not creating duplicate")
                print(f"🗑️ Deleting redundant feedback {feedback_id}")
                
                try:
                    db.client.table('feedback').delete().eq('id', feedback_id).execute()
                    print(f"Feedback deleted")
                except Exception as e:
                    print(f"Failed to delete feedback: {e}")
                
                return jsonify({
                    'success': True,
                    'message': f'You have already completed training for {selected_competency}',
                    'skipped_ai_call': True,
                    'feedback_deleted': True,
                    'reason': 'Training already completed for this competency'
                })
            
            elif status == 'in_progress':
                print(f"Training already IN PROGRESS - not creating duplicate")
                print(f"Deleting redundant feedback {feedback_id}")
                
                try:
                    db.client.table('feedback').delete().eq('id', feedback_id).execute()
                    print(f"Feedback deleted")
                except Exception as e:
                    print(f"Failed to delete feedback: {e}")
                
                return jsonify({
                    'success': True,
                    'message': f'You already have in-progress training for {selected_competency}',
                    'skipped_ai_call': True,
                    'feedback_deleted': True,
                    'reason': 'Training already in progress for this competency'
                })
            
            elif status == 'not_started':
                print(f"Training exists but NOT STARTED - will update with new feedback")
              
        print(f"\nCalling Gemini API to generate personalized content...")
        try:
            teacher_profile = {
                'name': teacher.get('name'),
                'subject': 'General',
                'experience': 5,
                'gap_areas': inferred_gaps
            }
            
            personalization_result = personalizer.personalize_training_module(
                base_module,
                teacher_profile,
                cluster_context
            )
            
            personalized_content = personalization_result.get('personalized_content')
            adaptation_metadata = personalization_result.get('adaptations_made', {})
            print(f"AI content generated successfully")
            
        except Exception as e:
            print(f"AI Error: {e} - using fallback content")
            personalized_content = base_module.get('description', 'Training content')
            adaptation_metadata = {}

        try:
            if existing_for_competency and existing_for_competency['status'] == 'not_started':
                assignment_id = existing_for_competency['id']
                
                print(f"Updating existing not_started assignment...")
                db.client.table('teacher_training_assignments')\
                    .update({
                        'source_feedback_id': feedback_id,
                        'assigned_reason': f"Updated: {', '.join(inferred_gaps)} (from recent feedback)",
                        'assigned_date': 'now()' 
                    })\
                    .eq('id', assignment_id)\
                    .execute()
                
                print(f"Updated assignment {assignment_id}")
                existing_content = db.client.table('personalized_training')\
                    .select('id')\
                    .eq('teacher_id', teacher_id)\
                    .eq('module_id', base_module['id'])\
                    .execute()
                
                if existing_content.data:
                    db.client.table('personalized_training')\
                        .update({
                            'personalized_content': personalized_content,
                            'adaptation_metadata': adaptation_metadata,
                            'feedback_id': feedback_id
                        })\
                        .eq('teacher_id', teacher_id)\
                        .eq('module_id', base_module['id'])\
                        .execute()
                    print(f"Updated personalized content")
                else:
                    db.client.table('personalized_training')\
                        .insert({
                            'teacher_id': teacher_id,
                            'module_id': base_module['id'],
                            'personalized_content': personalized_content,
                            'adaptation_metadata': adaptation_metadata,
                            'feedback_id': feedback_id
                        })\
                        .execute()
                    print(f"Created personalized content")
                
                already_existed = True
                
            else:
                print(f"Creating NEW training assignment for {selected_competency}...")
                
                assignment_payload = {
                    "teacher_id": teacher_id,
                    "module_id": base_module['id'],
                    "assigned_by": "ai",
                    "assigned_reason": f"Based on feedback analysis: {selected_competency} (score: {gap_scores.get(selected_competency, 0):.2f})",
                    "source_feedback_id": feedback_id,
                    "status": "not_started",
                    "progress_percentage": 0
                }
                
                assignment_result = db.client.table('teacher_training_assignments')\
                    .insert(assignment_payload)\
                    .execute()
                
                assignment_id = assignment_result.data[0]['id']
                print(f"Created new assignment: {assignment_id}")
                
                personalized_payload = {
                    "teacher_id": teacher_id,
                    "module_id": base_module['id'],
                    "personalized_content": personalized_content,
                    "adaptation_metadata": adaptation_metadata,
                    "feedback_id": feedback_id
                }
                
                db.client.table('personalized_training').insert(personalized_payload).execute()
                print(f"Created personalized content")
                
                already_existed = False
                
        except Exception as e:
            print(f"Database save error: {e}")
            traceback.print_exc()
            return jsonify({'error': f'Failed to save training: {str(e)}'}), 500

        try:
            db.client.table('feedback').update({
                'status': 'training_assigned'
            }).eq('id', feedback_id).execute()
            print(f"Updated feedback status to 'training_assigned'")
        except Exception as e:
            print(f"Feedback update error: {e}")
        
        print(f"\n{'='*80}")
        print(f"FEEDBACK TO TRAINING COMPLETE")
        print(f"{'='*80}\n")
        
        return jsonify({
            'success': True,
            'assigned_module': base_module['title'],
            'competency': selected_competency,
            'competency_score': gap_scores.get(selected_competency, 0),
            'personalized_message': personalized_content[:200] + '...',
            'already_existed': already_existed,
            'feedback_deleted': False
        })
        
    except Exception as e:
        print(f"UNEXPECTED ERROR: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    print(f"\nPersonalization Service Starting on port {port}...\n")
    app.run(host='0.0.0.0', port=port, debug=True)
