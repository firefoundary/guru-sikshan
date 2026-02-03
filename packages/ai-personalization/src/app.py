import os
import traceback
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../.env'))

from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

if os.getenv('GEMINI_API_KEY'):
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

from supabase_client import db
from llm_personalizer import personalizer
from rag_module_matcher import rag_matcher

print("\n" + "="*80)
print("INITIALIZING AI PERSONALIZATION SERVICE")
print("="*80)

db.initialize_default_mappings()

stats = rag_matcher.get_collection_stats()
print(f"\nRAG System Status:")
print(f"  ChromaDB modules: {stats['total_modules']}")
print(f"  Total chunks: {stats['total_chunks']}")

if stats['total_chunks'] == 0:
    print("\n  WARNING: No training modules loaded in RAG")
    print("  Run: python test_with_local_pdf.py to load PDFs")

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    current_stats = rag_matcher.get_collection_stats()
    return jsonify({
        'status': 'healthy',
        'service': 'ai-personalization',
        'rag_modules': current_stats['total_modules'],
        'rag_chunks': current_stats['total_chunks']
    })

@app.route('/api/rag-stats', methods=['GET'])
def rag_stats():
    stats = rag_matcher.get_collection_stats()
    return jsonify({
        'success': True,
        'stats': stats
    })

@app.route('/api/upload-training-pdf', methods=['POST'])
def upload_training_pdf():
    try:
        if 'pdf' not in request.files:
            return jsonify({'error': 'No PDF file provided'}), 400
        
        file = request.files['pdf']
        module_id = request.form.get('module_id')
        module_name = request.form.get('module_name')
        competency_area = request.form.get('competency_area')
        
        if not all([module_id, module_name, competency_area]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        uploads_dir = Path(__file__).parent / 'uploads'
        uploads_dir.mkdir(exist_ok=True)
        
        pdf_path = uploads_dir / f"{module_id}.pdf"
        file.save(str(pdf_path))
        
        chunk_count = rag_matcher.process_pdf_module(
            pdf_path=str(pdf_path),
            module_id=module_id,
            module_name=module_name,
            competency_area=competency_area
        )
        
        db.client.table('training_modules').update({
            'pdf_storage_path': str(pdf_path),
            'chunk_count': chunk_count,
            'last_pdf_upload': 'now()'
        }).eq('id', module_id).execute()
        
        return jsonify({
            'success': True,
            'message': f'Processed {chunk_count} chunks',
            'module_id': module_id,
            'chunks': chunk_count
        })
    
    except Exception as e:
        print(f"Upload error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/process-all-pdfs', methods=['POST'])
def process_all_pdfs():
    try:
        from test_with_local_pdf import process_all_pdfs_in_folder
        
        success = process_all_pdfs_in_folder()
        
        stats = rag_matcher.get_collection_stats()
        
        return jsonify({
            'success': success,
            'message': 'Processed PDFs successfully',
            'total_modules': stats['total_modules'],
            'total_chunks': stats['total_chunks'],
            'modules': stats['modules']
        })
    except Exception as e:
        print(f"Process all PDFs error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/feedback-to-training', methods=['POST'])
def feedback_to_training():
    try:
        data = request.json or {}
        teacher_id = data.get('teacher_id')
        
        issue_id = data.get('issue_id')
        
        if not teacher_id or not issue_id:
            return jsonify({'error': 'teacher_id and issue_id required'}), 400
        
        print(f"\n{'='*80}")
        print(f"ISSUE TO TRAINING (RAG-POWERED)")
        print(f"{'='*80}")
        
        issue = db.get_issue_by_id(issue_id)
        if not issue:
            return jsonify({'error': 'Issue not found'}), 404
        
        issue_text = issue['description']
        print(f"Issue: \"{issue_text[:100]}...\"")
        
        rag_result = rag_matcher.find_best_module_for_feedback(
            feedback_text=issue_text,
            top_k=5
        )
        
        if 'error' in rag_result:
            print(f"RAG failed, using simple keyword fallback")
            
            issue_lower = issue_text.lower()
            competency_keywords = {
                'classroom_management': ['disruptive', 'behavior', 'discipline', 'noise', 'talking', 'control'],
                'pedagogy': ['teaching', 'explain', 'understand', 'learning', 'method'],
                'content_knowledge': ['subject', 'topic', 'curriculum', 'content', 'knowledge'],
                'technology_usage': ['computer', 'digital', 'technology', 'online', 'software'],
                'student_engagement': ['engagement', 'participation', 'interest', 'motivation', 'attention']
            }
            
            scores = {}
            for comp, keywords in competency_keywords.items():
                scores[comp] = sum(1 for kw in keywords if kw in issue_lower)
            
            selected_competency = max(scores.items(), key=lambda x: x[1])[0] if max(scores.values()) > 0 else 'classroom_management'
            confidence = 0.5
            
            module_response = db.client.table('training_modules')\
                .select('*')\
                .eq('competency_area', selected_competency)\
                .limit(1)\
                .execute()
            
            if not module_response.data:
                return jsonify({'error': 'No training module found'}), 500
            
            base_module = module_response.data[0]
            relevant_chunks = []
            method = 'keyword_fallback'
        else:
            module_id = rag_result['module_id']
            selected_competency = rag_result['competency_area']
            confidence = rag_result['confidence_score']
            relevant_chunks = rag_result['relevant_chunks']
            
            module_response = db.client.table('training_modules')\
                .select('*')\
                .eq('id', module_id)\
                .single()\
                .execute()
            
            if not module_response.data:
                return jsonify({'error': 'Module not found'}), 500
            
            base_module = module_response.data
            method = 'rag_semantic'
        
        print(f"Module: {base_module['title']}")
        print(f"Competency: {selected_competency}")
        print(f"Confidence: {confidence:.2f}")
        print(f"Method: {method}")
        
        teacher = db.get_teacher_by_id(teacher_id)
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        
        existing_check = db.client.table('teacher_training_assignments')\
            .select('id, status, module_id')\
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
        
        if existing_for_competency and existing_for_competency['status'] in ['completed', 'in_progress']:
            status = existing_for_competency['status']
            print(f"Training already {status}, deleting issue")
            
            try:
                db.client.table('issues').delete().eq('id', issue_id).execute()
            except:
                pass
            
            return jsonify({
                'success': True,
                'message': f'Training already {status} for {selected_competency}',
                'skipped_ai_call': True,
                'issue_deleted': True,
                'reason': f'Training {status}'
            })
            
        print(f"Generating personalized content...")
        try:
            teacher_profile = {
                'name': teacher.get('name', 'Teacher'),
                'subject': 'General',
                'experience': 5,
                'gap_areas': [selected_competency]
            }
            
            cluster_context = {
                'location': teacher.get('cluster', 'Rural India'),
                'common_issues': issue_text[:200],
                'language': 'Hindi',
                'infrastructure': 'Basic',
                'class_size': '40-50 students',
                'dialect': 'Regional'
            }
            
            # ✅ UPDATED: Pass RAG chunks directly to personalizer
            personalization_result = personalizer.personalize_training_module(
                base_module,
                teacher_profile,
                cluster_context,
                rag_chunks=relevant_chunks  # ✅ Pass the chunks here
            )
            
            personalized_content = personalization_result.get('personalized_content')
            adaptation_metadata = personalization_result.get('adaptations_made', {})
            adaptation_metadata['rag_confidence'] = confidence
            adaptation_metadata['rag_chunks_used'] = len(relevant_chunks)
            adaptation_metadata['matching_method'] = method
            
            print(f"✅ Personalized content generated using {len(relevant_chunks)} RAG chunks")
        except Exception as e:
            print(f"Personalization error: {e}")
            personalized_content = base_module.get('description', 'Training content')
            adaptation_metadata = {'error': str(e)}
        
        if existing_for_competency and existing_for_competency['status'] == 'not_started':
            assignment_id = existing_for_competency['id']
            
            db.client.table('teacher_training_assignments')\
                .update({
                    'source_issue_id': issue_id,
                    'assigned_reason': f"{method}: {selected_competency} (conf: {confidence:.2f})",
                    'rag_confidence': confidence
                })\
                .eq('id', assignment_id)\
                .execute()
            
            already_existed = True
        else:
            assignment_payload = {
                "teacher_id": teacher_id,
                "module_id": base_module['id'],
                "assigned_by": "ai_rag",
                "assigned_reason": f"{method}: {selected_competency} (confidence: {confidence:.2f})",
                "source_issue_id": issue_id,
                "status": "not_started",
                "progress_percentage": 0,
                "rag_confidence": confidence
            }
            
            db.client.table('teacher_training_assignments')\
                .insert(assignment_payload)\
                .execute()
            
            already_existed = False
        
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
                    'issue_id': issue_id
                })\
                .eq('teacher_id', teacher_id)\
                .eq('module_id', base_module['id'])\
                .execute()
        else:
            db.client.table('personalized_training')\
                .insert({
                    'teacher_id': teacher_id,
                    'module_id': base_module['id'],
                    'personalized_content': personalized_content,
                    'adaptation_metadata': adaptation_metadata,
                    'issue_id': issue_id
                })\
                .execute()
        
        db.client.table('issues').update({
            'status': 'training_assigned'
        }).eq('id', issue_id).execute()
        
        print(f"{'='*80}")
        print(f"SUCCESS")
        print(f"{'='*80}\n")
        
        return jsonify({
            'success': True,
            'assigned_module': base_module['title'],
            'competency': selected_competency,
            'competency_confidence': confidence,
            'matching_method': method,
            'personalized_message': (personalized_content or '')[:200] + '...',
            'already_existed': already_existed,
            'issue_deleted': False,
            'rag_enabled': True
        })
        
    except Exception as e:
        print(f"ERROR: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    print(f"\nAI Personalization Service starting on port {port}")
    print(f"RAG System: {'ACTIVE' if stats['total_chunks'] > 0 else 'INACTIVE'}\n")
    app.run(host='0.0.0.0', port=port, debug=True)