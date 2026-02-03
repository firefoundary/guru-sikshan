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
            print(f"RAG matching failed: {rag_result['error']}")
            print(f"No training module could be matched. Deleting issue.")
            
            try:
                db.client.table('issues').delete().eq('id', issue_id).execute()
            except:
                pass
            
            return jsonify({
                'success': True,
                'message': 'No suitable training module found',
                'skipped_ai_call': True,
                'issue_deleted': True,
                'reason': 'RAG matching failed'
            })
        
        module_id = rag_result['module_id']
        selected_competency = rag_result['competency_area']
        confidence = rag_result['confidence_score']
        relevant_chunks = rag_result['relevant_chunks']
        
        print(f"\nBest matched module:")
        print(f"  Module ID: {module_id}")
        print(f"  Competency: {selected_competency}")
        print(f"  Confidence: {confidence:.2f}")
        print(f"  Chunks: {len(relevant_chunks)}")
        
        module_response = db.client.table('training_modules')\
            .select('*')\
            .eq('id', module_id)\
            .single()\
            .execute()
        
        if not module_response.data:
            return jsonify({'error': 'Matched module not found in database'}), 500
        
        base_module = module_response.data
        method = 'rag_semantic'
        
        print(f"  Module Title: {base_module['title']}")
        
        teacher = db.get_teacher_by_id(teacher_id)
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        
        print(f"\nChecking if THIS SPECIFIC MODULE is already assigned to teacher...")
        
        existing_assignment = db.client.table('teacher_training_assignments')\
            .select('id, status')\
            .eq('teacher_id', teacher_id)\
            .eq('module_id', module_id)\
            .execute()
        
        if existing_assignment.data and len(existing_assignment.data) > 0:
            assignment = existing_assignment.data[0]
            status = assignment['status']
            
            print(f"  Found existing assignment for this module:")
            print(f"    Assignment ID: {assignment['id']}")
            print(f"    Status: {status}")
            
            if status in ['completed', 'in_progress']:
                print(f"  Training already {status} for this specific module.")
                print(f"  Deleting issue and skipping assignment.")
                
                try:
                    db.client.table('issues').delete().eq('id', issue_id).execute()
                except Exception as del_error:
                    print(f"  Warning: Could not delete issue: {del_error}")
                
                return jsonify({
                    'success': True,
                    'message': f'Training already {status} for module: {base_module["title"]}',
                    'skipped_ai_call': True,
                    'issue_deleted': True,
                    'reason': f'Module already {status}',
                    'module_title': base_module['title'],
                    'module_id': module_id,
                    'status': status
                })
            
            elif status == 'not_started':
                print(f"  Assignment exists but not started. Updating with new issue reference.")
                
                db.client.table('teacher_training_assignments')\
                    .update({
                        'source_issue_id': issue_id,
                        'assigned_reason': f"{method}: {selected_competency} (conf: {confidence:.2f})",
                        'rag_confidence': confidence
                    })\
                    .eq('id', assignment['id'])\
                    .execute()
                
                already_existed = True
                assignment_id = assignment['id']
        else:
            print(f"  No existing assignment for this module. Creating new assignment.")
            already_existed = False
        
        print(f"\nGenerating personalized content...")
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
            
            personalization_result = personalizer.personalize_training_module(
                base_module,
                teacher_profile,
                cluster_context,
                rag_chunks=relevant_chunks
            )
            
            personalized_content = personalization_result.get('personalized_content')
            adaptation_metadata = personalization_result.get('adaptation_metadata', {})
            adaptation_metadata['rag_confidence'] = confidence
            adaptation_metadata['rag_chunks_used'] = len(relevant_chunks)
            adaptation_metadata['matching_method'] = method
            
            print(f"  Personalization complete using {len(relevant_chunks)} chunks")
        except Exception as e:
            print(f"  Personalization error: {e}")
            personalized_content = base_module.get('description', 'Training content')
            adaptation_metadata = {'error': str(e)}
        
        if not already_existed:
            print(f"\nCreating new training assignment...")
            
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
            
            assignment_result = db.client.table('teacher_training_assignments')\
                .insert(assignment_payload)\
                .execute()
            
            if assignment_result.data:
                assignment_id = assignment_result.data[0]['id']
                print(f"  Created assignment ID: {assignment_id}")
        
        print(f"\nSaving personalized content...")
        
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
            
            print(f"  Updated existing personalized content")
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
            
            print(f"  Created new personalized content")
        
        db.client.table('issues').update({
            'status': 'training_assigned'
        }).eq('id', issue_id).execute()
        
        print(f"\n{'='*80}")
        print(f"SUCCESS - Training Assigned")
        print(f"  Module: {base_module['title']}")
        print(f"  Module ID: {module_id}")
        print(f"  Confidence: {confidence:.2f}")
        print(f"  Method: {method}")
        print(f"  Already Existed: {already_existed}")
        print(f"{'='*80}\n")
        
        return jsonify({
            'success': True,
            'assigned_module': base_module['title'],
            'module_id': base_module['id'],
            'competency': selected_competency,
            'competency_confidence': confidence,
            'matching_method': method,
            'personalized_message': (personalized_content or '')[:200] + '...',
            'already_existed': already_existed,
            'issue_deleted': False,
            'rag_enabled': True,
            'chunks_used': len(relevant_chunks)
        })
        
    except Exception as e:
        print(f"\nERROR: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    print(f"\nAI Personalization Service starting on port {port}")
    print(f"RAG System: {'ACTIVE' if stats['total_chunks'] > 0 else 'INACTIVE'}")
    print(f"Modules Loaded: {stats['total_modules']}")
    print(f"Total Chunks: {stats['total_chunks']}\n")
    app.run(host='0.0.0.0', port=port, debug=True)
