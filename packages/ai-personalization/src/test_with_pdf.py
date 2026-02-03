import os
import re
from pathlib import Path
from rag_module_matcher import rag_matcher
from supabase_client import db

def auto_detect_competency(pdf_name, first_page_text):
    """Auto-detect competency from PDF filename and content"""
    
    content_lower = pdf_name.lower() + " " + first_page_text.lower()
    
    competency_keywords = {
        'classroom_management': ['classroom', 'behavior', 'discipline', 'management', 'control'],
        'pedagogy': ['teaching', 'pedagogy', 'instruction', 'learning', 'methods', 'strategies'],
        'content_knowledge': ['subject', 'content', 'knowledge', 'curriculum', 'syllabus'],
        'technology_usage': ['technology', 'digital', 'computer', 'online', 'software', 'tech'],
        'student_engagement': ['engagement', 'motivation', 'participation', 'interest', 'active']
    }
    
    scores = {}
    for competency, keywords in competency_keywords.items():
        score = sum(1 for keyword in keywords if keyword in content_lower)
        scores[competency] = score
    
    best_competency = max(scores.items(), key=lambda x: x[1])
    return best_competency[0] if best_competency[1] > 0 else 'pedagogy'

def extract_module_name_from_pdf(pdf_name, first_page_text):
    """Extract module name from PDF filename or first page"""
    
    base_name = pdf_name.replace('.pdf', '').replace('_', ' ').replace('-', ' ')
    
    lines = first_page_text.split('\n')
    for line in lines[:10]:
        line = line.strip()
        if len(line) > 10 and len(line) < 100:
            if any(word in line.lower() for word in ['module', 'training', 'guide', 'manual']):
                return line
    
    if len(base_name) > 5:
        return base_name.title()
    
    return "Training Module"

def process_all_pdfs_in_folder():
    """Process all PDFs in src folder and sync with Supabase"""
    
    pdf_folder = Path(__file__).parent
    pdf_files = list(pdf_folder.glob("*.pdf"))
    
    print("\n" + "="*80)
    print("AUTO-PROCESSING PDFs FOR RAG SYSTEM")
    print("="*80)
    
    if not pdf_files:
        print("\nNo PDF files found in:", pdf_folder)
        print("Place training module PDFs in packages/ai-personalization/src/")
        return False
    
    print(f"\nFound {len(pdf_files)} PDF(s):")
    for idx, pdf in enumerate(pdf_files, 1):
        print(f"  {idx}. {pdf.name}")
    
    processed_count = 0
    
    for pdf_path in pdf_files:
        try:
            print(f"\n" + "-"*80)
            print(f"Processing: {pdf_path.name}")
            print("-"*80)
            
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                first_page = pdf.pages[0]
                first_page_text = first_page.extract_text() or ""
            
            competency_area = auto_detect_competency(pdf_path.name, first_page_text)
            module_name = extract_module_name_from_pdf(pdf_path.name, first_page_text)
            
            print(f"Auto-detected:")
            print(f"  Module Name: {module_name}")
            print(f"  Competency: {competency_area}")
            
            module_id = f"module_{pdf_path.stem}"
            
            existing_module = db.client.table('training_modules')\
                .select('id')\
                .eq('id', module_id)\
                .execute()
            
            if not existing_module.data:
                print(f"Creating new module in Supabase...")
                db.client.table('training_modules').insert({
                    'id': module_id,
                    'title': module_name,
                    'description': f'Auto-generated from {pdf_path.name}',
                    'competency_area': competency_area,
                    'content_type': 'article',
                    'pdf_storage_path': str(pdf_path),
                    'module_source': 'RAG_AUTO'
                }).execute()
                print(f"Module created in database")
            else:
                print(f"Module already exists in database")
            
            chunk_count = rag_matcher.process_pdf_module(
                pdf_path=str(pdf_path),
                module_id=module_id,
                module_name=module_name,
                competency_area=competency_area
            )
            
            db.client.table('training_modules').update({
                'chunk_count': chunk_count,
                'last_pdf_upload': 'now()'
            }).eq('id', module_id).execute()
            
            print(f"Success: {chunk_count} chunks stored")
            processed_count += 1
            
        except Exception as e:
            print(f"Error processing {pdf_path.name}: {e}")
            continue
    
    print("\n" + "="*80)
    print(f"PROCESSING COMPLETE: {processed_count}/{len(pdf_files)} PDFs")
    print("="*80)
    
    return processed_count > 0

def test_rag_search():
    """Test semantic search with sample queries"""
    
    stats = rag_matcher.get_collection_stats()
    
    if stats['total_chunks'] == 0:
        print("\nNo modules in ChromaDB. Run process_all_pdfs_in_folder() first.")
        return
    
    print("\n" + "="*80)
    print("TESTING SEMANTIC SEARCH")
    print("="*80)
    
    print(f"\nChromaDB Status:")
    print(f"  Total modules: {stats['total_modules']}")
    print(f"  Total chunks: {stats['total_chunks']}")
    
    if stats['modules']:
        print(f"\nStored modules:")
        for mod_id, mod_data in stats['modules'].items():
            print(f"  - {mod_data['name']}")
            print(f"    Competency: {mod_data['competency']}")
            print(f"    Chunks: {mod_data['chunks']}")
    
    test_feedbacks = [
        "Students are very disruptive and won't stop talking during my lessons",
        "I struggle to explain complex concepts in simple terms to my students",
        "Students don't participate or engage with the material at all",
        "I don't know how to use digital tools effectively in my classroom"
    ]
    
    print("\n" + "-"*80)
    print("Sample Feedback Testing:")
    print("-"*80)
    
    for idx, feedback in enumerate(test_feedbacks, 1):
        print(f"\n{idx}. Feedback: \"{feedback}\"")
        
        result = rag_matcher.find_best_module_for_feedback(
            feedback_text=feedback,
            top_k=3
        )
        
        if 'error' not in result:
            print(f"   Matched Module: {result['module_name']}")
            print(f"   Competency: {result['competency_area']}")
            print(f"   Confidence: {result['confidence_score']:.2f}")
            print(f"   Chunks: {len(result['relevant_chunks'])}")
        else:
            print(f"   No match found")
    
    print("\n" + "="*80)
    print("RAG SYSTEM READY FOR PRODUCTION")
    print("="*80)

if __name__ == "__main__":
    print("\nRAG Setup & Test Script")
    print("="*80)
    
    success = process_all_pdfs_in_folder()
    
    if success:
        test_rag_search()
        print("\nNext: Start your Flask app.py - RAG is integrated!")
    else:
        print("\nPlace PDF files in packages/ai-personalization/src/ and run again")