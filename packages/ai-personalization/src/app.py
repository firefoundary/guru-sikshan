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

@app.route('/api/summarize-module-feedback', methods=['POST'])
def summarize_module_feedback():
    """
    Summarize feedback for a specific training module
    """
    try:
        data = request.json or {}
        module_id = data.get('module_id')
        feedback_ids = data.get('feedback_ids', [])
        
        if not module_id or not feedback_ids:
            return jsonify({'error': 'module_id and feedback_ids required'}), 400
        
        print(f"\n{'='*80}")
        print(f"MODULE FEEDBACK SUMMARIZATION")
        print(f"{'='*80}")
        print(f"Module ID: {module_id}")
        print(f"Feedback count: {len(feedback_ids)}")
        
        # Get module details
        module_response = db.client.table('training_modules')\
            .select('id, title, competency_area')\
            .eq('id', module_id)\
            .single()\
            .execute()
        
        if not module_response.data:
            return jsonify({'error': 'Module not found'}), 404
        
        module = module_response.data
        
        # Fetch feedbacks
        feedbacks_data = []
        for fb_id in feedback_ids:
            fb_response = db.client.table('training_feedback')\
                .select('*')\
                .eq('id', fb_id)\
                .single()\
                .execute()
            
            if fb_response.data:
                feedbacks_data.append(fb_response.data)
        
        if len(feedbacks_data) < 2:
            return jsonify({
                'error': 'At least 2 feedbacks required for summary'
            }), 400
        
        print(f"Summarizing {len(feedbacks_data)} feedbacks for module: {module['title']}")
        
        # Prepare feedback data
        feedback_texts = []
        for i, fb in enumerate(feedbacks_data, 1):
            rating_stars = '★' * fb['rating'] + '☆' * (5 - fb['rating'])
            helpful = "Yes" if fb['was_helpful'] else "No"
            comment = fb['comment'] if fb['comment'] else "No comment"
            
            feedback_text = f"""
Teacher {i} - {fb['teacher_name']}:
- Rating: {rating_stars} ({fb['rating']}/5)
- Was Helpful: {helpful}
- Comment: {comment}
- Still Has Issue: {"Yes" if fb.get('still_has_issue') else "No"}
- Needs Support: {"Yes" if fb.get('needs_additional_support') else "No"}
"""
            feedback_texts.append(feedback_text)
        
        combined_feedback = "\n".join(feedback_texts)
        
        prompt = f"""You are an educational analyst summarizing teacher feedback for a specific training module.

MODULE: {module['title']}
COMPETENCY AREA: {module['competency_area']}

FEEDBACK FROM {len(feedbacks_data)} TEACHERS:
{combined_feedback}

Generate a concise summary (50 words max without using markdown format) for this specific module covering:

1. OVERALL EFFECTIVENESS
   - How well this module performed
   - General satisfaction level

2. WHAT WORKED WELL
   - Specific strengths teachers mentioned
   - Most helpful aspects

3. AREAS FOR IMPROVEMENT
   - Common issues or confusion points
   - What needs clarification or enhancement

4. RECOMMENDATIONS
   - Specific improvements for this module
   - Follow-up needs for struggling teachers

Use a professional, actionable tone. Focus on module-specific insights.

Summary:"""

        try:
            model = genai.GenerativeModel(
                'gemini-2.5-flash',
                generation_config={
                    "temperature": 0.7,
                    "max_output_tokens": 500,
                }
            )
            
            response = model.generate_content(prompt)
            summary = response.text.strip()
            
            print(f"AI summary generated for module")
            
        except Exception as ai_error:
            print(f"AI generation error: {ai_error}")
            avg_rating = sum(fb['rating'] for fb in feedbacks_data) / len(feedbacks_data)
            helpful_count = sum(1 for fb in feedbacks_data if fb['was_helpful'])
            
            summary = f"""Module Performance Summary:

This module received {len(feedbacks_data)} responses with an average rating of {avg_rating:.1f}/5 stars. {helpful_count} out of {len(feedbacks_data)} teachers found it helpful.

{'Most teachers found the content effective.' if helpful_count > len(feedbacks_data)/2 else 'The module may need improvements based on teacher feedback.'}"""
        
        # Calculate statistics
        avg_rating = sum(fb['rating'] for fb in feedbacks_data) / len(feedbacks_data)
        helpful_count = sum(1 for fb in feedbacks_data if fb['was_helpful'])
        needs_support = sum(1 for fb in feedbacks_data if fb.get('needs_additional_support', False))
        still_has_issues = sum(1 for fb in feedbacks_data if fb.get('still_has_issue', False))
        
        print(f"Summary complete")
        print(f"{'='*80}\n")
        
        return jsonify({
            'success': True,
            'module_id': module_id,
            'feedback_count': len(feedbacks_data),
            'summary': summary,
            'statistics': {
                'average_rating': round(avg_rating, 1),
                'helpful_count': helpful_count,
                'needs_support': needs_support,
                'still_has_issues': still_has_issues
            }
        })
        
    except Exception as e:
        print(f"\nERROR: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/summarize-all-feedback', methods=['POST'])
def summarize_all_feedback():
    """
    Summarize all training feedbacks across all teachers
    """
    try:
        data = request.json or {}
        feedback_ids = data.get('feedback_ids', [])
        
        if not feedback_ids:
            return jsonify({'error': 'feedback_ids required'}), 400
        
        print(f"\n{'='*80}")
        print(f"ALL FEEDBACK SUMMARIZATION")
        print(f"{'='*80}")
        print(f"Feedback IDs count: {len(feedback_ids)}")
        
        # Fetch all feedbacks
        feedbacks_data = []
        for fb_id in feedback_ids:
            fb_response = db.client.table('training_feedback')\
                .select('''
                    *,
                    training_modules (
                        id, title, competency_area
                    )
                ''')\
                .eq('id', fb_id)\
                .single()\
                .execute()
            
            if fb_response.data:
                feedbacks_data.append(fb_response.data)
        
        if len(feedbacks_data) == 0:
            return jsonify({
                'success': True,
                'feedback_count': 0,
                'summary': None
            })
        
        print(f"Processing {len(feedbacks_data)} feedbacks")
        
        # Prepare feedback data
        feedback_texts = []
        for i, fb in enumerate(feedbacks_data, 1):
            module_title = fb['training_modules']['title'] if fb.get('training_modules') else 'Unknown'
            competency = fb['training_modules']['competency_area'] if fb.get('training_modules') else 'Unknown'
            rating_stars = '★' * fb['rating'] + '☆' * (5 - fb['rating'])
            helpful = "Yes" if fb['was_helpful'] else "No"
            comment = fb['comment'] if fb['comment'] else "No comment"
            
            feedback_text = f"""
Feedback {i} - {fb['teacher_name']}:
- Module: {module_title}
- Competency: {competency}
- Rating: {rating_stars} ({fb['rating']}/5)
- Was Helpful: {helpful}
- Comment: {comment}
- Still Has Issue: {"Yes" if fb.get('still_has_issue') else "No"}
- Needs Support: {"Yes" if fb.get('needs_additional_support') else "No"}
"""
            feedback_texts.append(feedback_text)
        
        combined_feedback = "\n".join(feedback_texts)
        
        prompt = f"""You are an educational analyst summarizing teacher training feedback across multiple teachers.

Below are {len(feedbacks_data)} feedback entries from different teachers about professional development training:

{combined_feedback}

Generate a concise summary (200-250 words) covering:

1. OVERALL PROGRAM PERFORMANCE
   - Average satisfaction and trends
   - Most/least effective modules

2. COMMON STRENGTHS
   - What consistently works well
   - Positive patterns across feedbacks

3. AREAS NEEDING ATTENTION
   - Common challenges identified
   - Teachers needing additional support

4. ACTIONABLE RECOMMENDATIONS
   - Program improvements needed
   - Follow-up actions for specific teachers

Use a professional, data-driven tone. Focus on actionable insights for program administrators.

Summary:"""

        try:
            model = genai.GenerativeModel(
                'gemini-2.5-flash',
                generation_config={
                    "temperature": 0.7,
                    "max_output_tokens": 600,
                }
            )
            
            response = model.generate_content(prompt)
            summary = response.text.strip()
            
            print(f"AI summary generated successfully")
            
        except Exception as ai_error:
            print(f"AI generation error: {ai_error}")
            avg_rating = sum(fb['rating'] for fb in feedbacks_data) / len(feedbacks_data)
            helpful_count = sum(1 for fb in feedbacks_data if fb['was_helpful'])
            
            summary = f"""Training Program Summary:

{len(feedbacks_data)} teachers have completed training modules with an average rating of {avg_rating:.1f}/5 stars. {helpful_count} out of {len(feedbacks_data)} found the training helpful.

The program is showing {'positive engagement' if helpful_count > len(feedbacks_data)/2 else 'mixed results'} overall."""
        
        # Calculate statistics
        avg_rating = sum(fb['rating'] for fb in feedbacks_data) / len(feedbacks_data)
        helpful_count = sum(1 for fb in feedbacks_data if fb['was_helpful'])
        needs_support = sum(1 for fb in feedbacks_data if fb.get('needs_additional_support', False))
        still_has_issues = sum(1 for fb in feedbacks_data if fb.get('still_has_issue', False))
        
        competency_breakdown = {}
        for fb in feedbacks_data:
            comp = fb['training_modules']['competency_area'] if fb.get('training_modules') else 'Unknown'
            if comp not in competency_breakdown:
                competency_breakdown[comp] = {'count': 0, 'total_rating': 0}
            competency_breakdown[comp]['count'] += 1
            competency_breakdown[comp]['total_rating'] += fb['rating']
        
        for comp in competency_breakdown:
            competency_breakdown[comp]['avg_rating'] = competency_breakdown[comp]['total_rating'] / competency_breakdown[comp]['count']
        
        print(f"{'='*80}")
        print(f"SUMMARY COMPLETE")
        print(f"{'='*80}\n")
        
        return jsonify({
            'success': True,
            'feedback_count': len(feedbacks_data),
            'summary': summary,
            'statistics': {
                'average_rating': round(avg_rating, 1),
                'helpful_count': helpful_count,
                'needs_support': needs_support,
                'still_has_issues': still_has_issues,
                'competency_breakdown': competency_breakdown
            }
        })
        
    except Exception as e:
        print(f"\nERROR: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/summarize-feedback', methods=['POST'])
def summarize_feedback():
    """
    Summarize multiple training feedbacks for a teacher using Gemini AI
    """
    try:
        data = request.json or {}
        teacher_id = data.get('teacher_id')
        
        if not teacher_id:
            return jsonify({'error': 'teacher_id required'}), 400
        
        print(f"\n{'='*80}")
        print(f"FEEDBACK SUMMARIZATION REQUEST")
        print(f"{'='*80}")
        print(f"Teacher ID: {teacher_id}")
        
        # Fetch all training feedback for this teacher
        feedback_response = db.client.table('training_feedback')\
            .select('''
                *,
                training_modules (
                    id, title, competency_area
                )
            ''')\
            .eq('teacher_id', teacher_id)\
            .order('created_at', {'ascending': False})\
            .execute()
        
        if not feedback_response.data or len(feedback_response.data) == 0:
            return jsonify({
                'success': True,
                'feedback_count': 0,
                'summary': None,
                'message': 'No feedback submitted yet'
            })
        
        feedbacks = feedback_response.data
        feedback_count = len(feedbacks)
        
        print(f"Found {feedback_count} feedback entries")
        
        # If only 1 feedback, no need to summarize
        if feedback_count == 1:
            single_feedback = feedbacks[0]
            return jsonify({
                'success': True,
                'feedback_count': 1,
                'summary': None,
                'single_feedback': {
                    'module_title': single_feedback['training_modules']['title'] if single_feedback.get('training_modules') else 'Unknown',
                    'competency': single_feedback['training_modules']['competency_area'] if single_feedback.get('training_modules') else 'Unknown',
                    'rating': single_feedback['rating'],
                    'was_helpful': single_feedback['was_helpful'],
                    'comment': single_feedback['comment'],
                    'created_at': single_feedback['created_at']
                },
                'message': 'Single feedback - no summary needed'
            })
        
        # Multiple feedbacks - generate AI summary
        print(f"\nGenerating AI summary for {feedback_count} feedbacks...")
        
        # Prepare feedback data for AI
        feedback_texts = []
        for i, fb in enumerate(feedbacks, 1):
            module_title = fb['training_modules']['title'] if fb.get('training_modules') else 'Unknown Module'
            competency = fb['training_modules']['competency_area'] if fb.get('training_modules') else 'Unknown'
            rating_stars = '★' * fb['rating'] + '☆' * (5 - fb['rating'])
            helpful = "Yes" if fb['was_helpful'] else "No"
            comment = fb['comment'] if fb['comment'] else "No comment"
            
            feedback_text = f"""
Feedback {i}:
- Module: {module_title}
- Competency: {competency}
- Rating: {rating_stars} ({fb['rating']}/5)
- Was Helpful: {helpful}
- Comment: {comment}
- Still Has Issue: {"Yes" if fb.get('still_has_issue') else "No"}
- Needs Support: {"Yes" if fb.get('needs_additional_support') else "No"}
"""
            feedback_texts.append(feedback_text)
        
        combined_feedback = "\n".join(feedback_texts)
        
        # Create prompt for Gemini
        prompt = f"""You are an educational analyst summarizing teacher training feedback.

Below are {feedback_count} feedback entries from a teacher about their professional development training modules:

{combined_feedback}

Generate a concise summary (150-200 words) covering:

1. OVERALL SATISFACTION
   - Average rating and general sentiment
   - What modules were most/least helpful

2. KEY STRENGTHS
   - What worked well across trainings
   - Positive patterns mentioned

3. AREAS FOR IMPROVEMENT
   - Common challenges or issues
   - What needs more support

4. RECOMMENDATIONS
   - Suggested next steps for the teacher
   - Additional training needs if mentioned

Use a supportive, professional tone. Focus on actionable insights.

Summary:"""

        try:
            # Call Gemini API
            model = genai.GenerativeModel(
                'gemini-2.5-flash',
                generation_config={
                    "temperature": 0.7,
                    "max_output_tokens": 500,
                }
            )
            
            response = model.generate_content(prompt)
            summary = response.text.strip()
            
            print(f"AI summary generated successfully")
            print(f"Summary length: {len(summary)} characters")
            
        except Exception as ai_error:
            print(f"AI generation error: {ai_error}")
            # Fallback to basic summary
            avg_rating = sum(fb['rating'] for fb in feedbacks) / len(feedbacks)
            helpful_count = sum(1 for fb in feedbacks if fb['was_helpful'])
            
            summary = f"""Training Summary:

The teacher has completed {feedback_count} training modules with an average rating of {avg_rating:.1f}/5 stars. {helpful_count} out of {feedback_count} modules were found helpful.

Modules covered: {', '.join(set(fb['training_modules']['title'] for fb in feedbacks if fb.get('training_modules')))}.

The teacher's feedback indicates {'ongoing engagement' if helpful_count > feedback_count/2 else 'mixed results'} with the training content."""
        
        # Calculate statistics
        avg_rating = sum(fb['rating'] for fb in feedbacks) / len(feedbacks)
        helpful_count = sum(1 for fb in feedbacks if fb['was_helpful'])
        needs_support = sum(1 for fb in feedbacks if fb.get('needs_additional_support', False))
        still_has_issues = sum(1 for fb in feedbacks if fb.get('still_has_issue', False))
        
        competency_breakdown = {}
        for fb in feedbacks:
            comp = fb['training_modules']['competency_area'] if fb.get('training_modules') else 'Unknown'
            if comp not in competency_breakdown:
                competency_breakdown[comp] = {'count': 0, 'total_rating': 0}
            competency_breakdown[comp]['count'] += 1
            competency_breakdown[comp]['total_rating'] += fb['rating']
        
        for comp in competency_breakdown:
            competency_breakdown[comp]['avg_rating'] = competency_breakdown[comp]['total_rating'] / competency_breakdown[comp]['count']
        
        print(f"\n{'='*80}")
        print(f"SUMMARY GENERATION COMPLETE")
        print(f"{'='*80}\n")
        
        return jsonify({
            'success': True,
            'feedback_count': feedback_count,
            'summary': summary,
            'statistics': {
                'average_rating': round(avg_rating, 1),
                'helpful_count': helpful_count,
                'needs_support': needs_support,
                'still_has_issues': still_has_issues,
                'competency_breakdown': competency_breakdown
            },
            'feedbacks': [
                {
                    'id': fb['id'],
                    'module_title': fb['training_modules']['title'] if fb.get('training_modules') else 'Unknown',
                    'competency': fb['training_modules']['competency_area'] if fb.get('training_modules') else 'Unknown',
                    'rating': fb['rating'],
                    'was_helpful': fb['was_helpful'],
                    'comment': fb['comment'],
                    'created_at': fb['created_at']
                }
                for fb in feedbacks
            ]
        })
        
    except Exception as e:
        print(f"\nERROR in summarize_feedback: {e}")
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
