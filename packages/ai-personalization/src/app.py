import os
import traceback
from dotenv import load_dotenv

# 1. LOAD ENV FIRST
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

print(f"DEBUG: Loaded API Key starting with: {os.getenv('GEMINI_API_KEY')[:5] if os.getenv('GEMINI_API_KEY') else 'NONE'}")

from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

# 2. Configure Gemini through api key present in env

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

# app.py - FIXED /api/feedback-to-training endpoint
@app.route('/api/feedback-to-training', methods=['POST'])
def feedback_to_training():
    """Convert teacher feedback into personalized training assignment"""
    try:
        data = request.json
        teacher_id = data.get('teacher_id')
        feedback_id = data.get('feedback_id')
        
        if not teacher_id or not feedback_id:
            return jsonify({'error': 'teacher_id and feedback_id required'}), 400

        # 1. Analyze feedback
        feedback_analysis = feedback_analyzer.analyze_teacher_feedback(teacher_id)
        inferred_gaps = feedback_analysis.get('inferred_gaps', [])
        
        if not inferred_gaps:
            inferred_gaps = ['classroom_management']

        # 2. Get teacher
        teacher = db.get_teacher_by_id(teacher_id)
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404

        # 3. Get cluster context
        cluster_id = teacher.get('cluster_id') or teacher.get('cluster')
        cluster_context = {
            'location': 'Rural India',
            'common_issues': 'general challenges',
            'language': 'Hindi'
        }

        # 4. Get base training module by competency_area
        try:
            module_response = db.client.table('training_modules')\
                .select('*')\
                .eq('competency_area', inferred_gaps[0])\
                .limit(1)\
                .execute()
            
            if module_response.data:
                base_module = module_response.data[0]
            else:
                default_module = {
                    'title': f'{inferred_gaps[0].replace("_", " ").title()} Training',
                    'description': f'Personalized training for {inferred_gaps[0]}',
                    'competency_area': inferred_gaps[0],
                    'content_type': 'article',
                    'estimated_duration': '10-15 minutes'
                }
                created = db.client.table('training_modules').insert(default_module).execute()
                base_module = created.data[0]
        except Exception as e:
            print(f"Module fetch error: {e}")
            return jsonify({'error': 'Could not find training module'}), 500

        # 5. ✅ CHECK FOR EXISTING ASSIGNMENT FIRST
        print(f"🔍 Checking if teacher {teacher_id} already has module {base_module['id']} assigned...")
        
        existing_assignment = db.client.table('teacher_training_assignments')\
            .select('id, status, progress_percentage, source_feedback_id')\
            .eq('teacher_id', teacher_id)\
            .eq('module_id', base_module['id'])\
            .execute()
        
        if existing_assignment.data and len(existing_assignment.data) > 0:
            existing = existing_assignment.data[0]
            print(f"⚠️ Training already assigned: {existing['id']} (status: {existing['status']}, progress: {existing['progress_percentage']}%)")
            
            # ✅ DELETE FEEDBACK - Assignment already exists, feedback is void
            if existing['status'] == 'completed':
                print(f"🗑️ Deleting void feedback {feedback_id} - training already completed")
                try:
                    db.client.table('feedback').delete().eq('id', feedback_id).execute()
                    print(f"✅ Feedback deleted from database")
                except Exception as e:
                    print(f"⚠️ Failed to delete feedback: {e}")
                
                return jsonify({
                    'success': True,
                    'message': 'Training already completed',
                    'skipped_ai_call': True,
                    'feedback_deleted': True,
                    'reason': 'Assignment already completed'
                })
            
            # ✅ DELETE FEEDBACK - Training in progress, no need for duplicate feedback
            if existing['status'] == 'in_progress':
                print(f"🗑️ Deleting void feedback {feedback_id} - training in progress")
                try:
                    db.client.table('feedback').delete().eq('id', feedback_id).execute()
                    print(f"✅ Feedback deleted from database")
                except Exception as e:
                    print(f"⚠️ Failed to delete feedback: {e}")
                
                # Just update the source_feedback_id reference (even though we deleted it)
                db.client.table('teacher_training_assignments')\
                    .update({'source_feedback_id': None})\
                    .eq('id', existing['id'])\
                    .execute()
                
                return jsonify({
                    'success': True,
                    'message': 'Training in progress',
                    'skipped_ai_call': True,
                    'feedback_deleted': True,
                    'reason': 'Assignment already in progress'
                })
            
            # For 'not_started' - keep feedback and regenerate content
            print(f"🔄 Updating existing not_started assignment...")

        # 6. ✅ Generate personalized content with AI (for new or not_started)
        print(f"🤖 Calling Gemini API to generate personalized content...")
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
            print(f"✅ AI content generated successfully")
            
        except Exception as e:
            print(f"⚠️ AI Error: {e} - using fallback content")
            personalized_content = base_module.get('description', 'Training content')
            adaptation_metadata = {}
        
        # 7. Save or update assignment and content
        try:
            if existing_assignment.data and len(existing_assignment.data) > 0:
                # Update existing not_started assignment
                existing = existing_assignment.data[0]
                db.client.table('teacher_training_assignments')\
                    .update({
                        'source_feedback_id': feedback_id,
                        'assigned_reason': f"Updated: {', '.join(inferred_gaps)} (from recent feedback)"
                    })\
                    .eq('id', existing['id'])\
                    .execute()
                
                assignment_id = existing['id']
                print(f"✅ Updated existing assignment")
                
                # Upsert personalized content
                existing_content = db.client.table('personalized_training')\
                    .select('id')\
                    .eq('teacher_id', teacher_id)\
                    .eq('module_id', base_module['id'])\
                    .execute()
                
                if existing_content.data and len(existing_content.data) > 0:
                    db.client.table('personalized_training')\
                        .update({
                            'personalized_content': personalized_content,
                            'adaptation_metadata': adaptation_metadata,
                            'feedback_id': feedback_id
                        })\
                        .eq('teacher_id', teacher_id)\
                        .eq('module_id', base_module['id'])\
                        .execute()
                    print(f"✅ Updated personalized content")
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
                    print(f"✅ Created personalized content")
                
                already_existed = True
            else:
                # Create NEW assignment
                print(f"✨ Creating NEW training assignment...")
                assignment_payload = {
                    "teacher_id": teacher_id,
                    "module_id": base_module['id'],
                    "assigned_by": "ai",
                    "assigned_reason": f"Based on feedback: {', '.join(inferred_gaps)}",
                    "source_feedback_id": feedback_id,
                    "status": "not_started",
                    "progress_percentage": 0
                }
                
                assignment_result = db.client.table('teacher_training_assignments')\
                    .insert(assignment_payload)\
                    .execute()
                
                assignment_id = assignment_result.data[0]['id']
                print(f"✅ Created new assignment: {assignment_id}")
                
                # Save personalized content
                personalized_payload = {
                    "teacher_id": teacher_id,
                    "module_id": base_module['id'],
                    "personalized_content": personalized_content,
                    "adaptation_metadata": adaptation_metadata,
                    "feedback_id": feedback_id
                }
                
                db.client.table('personalized_training').insert(personalized_payload).execute()
                print(f"✅ Created personalized content")
                
                already_existed = False
            
        except Exception as e:
            print(f"❌ Database save error: {e}")
            traceback.print_exc()
            return jsonify({'error': f'Failed to save training: {str(e)}'}), 500

        # 8. Update feedback status (keep it for new/not_started assignments)
        try:
            db.client.table('feedback').update({
                'status': 'training_assigned'
            }).eq('id', feedback_id).execute()
            print(f"✅ Updated feedback status to 'training_assigned'")
        except Exception as e:
            print(f"⚠️ Feedback update error: {e}")

        print("=== FEEDBACK TO TRAINING COMPLETE ===\n")

        return jsonify({
            'success': True,
            'assigned_module': base_module['title'],
            'personalized_message': personalized_content[:200] + '...',
            'already_existed': already_existed,
            'feedback_deleted': False
        })
                
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    print(f"\n🚀 Personalization Service Starting on port {port}...\n")
    app.run(host='0.0.0.0', port=port, debug=True)