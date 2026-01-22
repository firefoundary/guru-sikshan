import os
import traceback
from dotenv import load_dotenv

# 1. LOAD ENV FIRST
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

print(f"DEBUG: Loaded API Key starting with: {os.getenv('GEMINI_API_KEY')[:5] if os.getenv('GEMINI_API_KEY') else 'NONE'}")

from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

# 2. Configure Gemini
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
        print("\n=== FEEDBACK TO TRAINING ROUTE ===")
        data = request.json
        print(f"Request data: {data}")
        
        teacher_id = data.get('teacher_id')
        feedback_id = data.get('feedback_id')
        
        if not teacher_id or not feedback_id:
            return jsonify({'error': 'teacher_id and feedback_id required'}), 400
        
        # 1. Analyze feedback
        print(f"Analyzing feedback for teacher: {teacher_id}")
        feedback_analysis = feedback_analyzer.analyze_teacher_feedback(teacher_id)
        inferred_gaps = feedback_analysis.get('inferred_gaps', [])
        
        if not inferred_gaps:
            # Fallback if no gaps found
            inferred_gaps = ['classroom_management'] 
        
        # 2. Get teacher
        teacher = db.get_teacher_by_id(teacher_id)
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
            
        # 3. Get cluster context
        cluster_id = teacher.get('cluster_id')
        try:
            cluster_response = db.client.table('clusters').select('*').eq('id', cluster_id).execute()
            cluster_data = cluster_response.data[0] if cluster_response.data else {}
        except:
            cluster_data = {}
        
        cluster_context = {
            'location': cluster_data.get('location', 'Rural India'),
            'common_issues': 'general challenges',
            'language': 'Hindi'
        }
        
        # 4. Get base training module
        try:
            module_response = db.client.table('training_modules')\
                .select('*')\
                .eq('competency_area', inferred_gaps[0])\
                .limit(1)\
                .execute()
            
            if module_response.data:
                base_module = module_response.data[0]
            else:
                base_module = {'id': 'default', 'title': 'General Pedagogy', 'description': 'Basics'}
        except Exception as e:
            print(f"Module fetch error: {e}")
            base_module = {'id': 'default', 'title': 'Classroom Management', 'description': 'Basics'}
        
        # 5. Generate personalized training
        print("Generating personalized content with AI...")
        try:
            model = genai.GenerativeModel('gemini-pro')
            prompt = f"""
            You are an expert teacher trainer.
            Teacher: {teacher.get('name')} 
            Issue Category: {inferred_gaps[0]}
            Module: {base_module['title']}
            
            Task: Write a very short, encouraging message (2 sentences) assigning this module to help with their recent feedback.
            """
            
            response = model.generate_content(prompt)
            personalized_text = response.text
        except Exception as e:
            print(f"AI Error (using fallback): {e}")
            personalized_text = f"We have assigned {base_module['title']} to help you with your recent feedback."

        # ==========================================
        # 6. SAVE TO DATABASE (THE FIX)
        # ==========================================
        print("Saving to database...")
        try:
            # We use DIRECT INSERT to ensure feedback_id is included
            training_payload = {
                "teacher_id": teacher_id,
                "training_module": base_module['title'],  # The name of the module
                "content": personalized_text,
                "status": "assigned",
                "feedback_id": feedback_id,  # <--- ✅ THIS IS THE CRITICAL LINK
                "completion_percentage": 0
            }
            
            db.client.table('personalized_training').insert(training_payload).execute()
            print("✅ Saved to personalized_training with feedback_id link!")
            
        except Exception as e:
            print(f"Database save error: {e}")
            traceback.print_exc()
        
        # 7. Update feedback status
        try:
            db.client.table('feedback').update({
                'status': 'training_assigned'
            }).eq('id', feedback_id).execute()
        except Exception as e:
            print(f"Feedback update error: {e}")
        
        print("=== FEEDBACK TO TRAINING COMPLETE ===\n")
        
        return jsonify({
            'success': True,
            'assigned_module': base_module['title'],
            'personalized_message': personalized_text
        })
        
    except Exception as e:
        print(f" UNEXPECTED ERROR: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    print(f"\n🚀 Personalization Service Starting on port {port}...\n")
    app.run(host='0.0.0.0', port=port, debug=True)