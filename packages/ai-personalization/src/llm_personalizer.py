import os
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# ==================== CONFIGURATION ====================

current_dir = Path(__file__).parent
dotenv_path = current_dir.parent.parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# ==================== CONTENT PERSONALIZER ====================

class ContentPersonalizer:
    """
    Personalizes training modules using RAG chunks for Indian school contexts
    Focuses on: Zero-resource implementation, Mixed-level classrooms, Local culture
    """
    
    def __init__(self):
        self.model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config={
                "temperature": 0.7,
                "response_mime_type": "text/plain"
            }
        )
    
    def personalize_training_module(self, base_module, teacher_profile, cluster_context, rag_chunks=None):
        """
        Args:
            base_module: DB row from training_modules (id, title, description, competency_area)
            teacher_profile: Dict from teachers table (name, cluster, preferred_language)
            cluster_context: Dict with location, infrastructure, class_size from cluster data
            rag_chunks: List of retrieved PDF chunks with 'text', 'page', 'score'
        
        Returns:
            Dict with personalized_content and adaptation_metadata (for personalized_training table)
        """
        
        prompt = self._build_prompt(base_module, teacher_profile, cluster_context, rag_chunks)
        
        try:
            response = self.model.generate_content(prompt)
            
            return {
                'success': True,
                'personalized_content': response.text,
                'original_module_id': base_module.get('id'),
                'rag_chunks_used': len(rag_chunks) if rag_chunks else 0,
                'adaptation_metadata': {
                    'cluster': cluster_context.get('location'),
                    'language': teacher_profile.get('preferred_language', 'en'),
                    'infrastructure': cluster_context.get('infrastructure', 'basic'),
                    'class_size': cluster_context.get('class_size', '40-50'),
                    'competency_gap': base_module.get('competency_area'),
                    'rag_enabled': bool(rag_chunks)
                }
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'personalized_content': base_module.get('description', base_module.get('full_content', '')),
                'adaptation_metadata': {'error': str(e)}
            }
    
    def _build_prompt(self, base_module, teacher_profile, cluster_context, rag_chunks=None):
        """Optimized prompt aligned with DB schema"""
        
        # Format RAG chunks
        if rag_chunks and len(rag_chunks) > 0:
            content_source = "\n**TRAINING CONTENT (Official Materials):**\n"
            for i, chunk in enumerate(rag_chunks[:5], 1):
                content_source += f"\n[Section {i}]:\n{chunk.get('text', '')}\n"
        else:
            content_source = f"\n**TRAINING CONTENT:**\n{base_module.get('full_content') or base_module.get('description', 'Content not available')}\n"
        
        language = teacher_profile.get('preferred_language', 'en')
        lang_map = {'en': 'English', 'hi': 'Hindi', 'kn': 'Kannada'}
        primary_language = lang_map.get(language, 'Hindi')
        
        return f"""Transform the training content below into a practical guide for {teacher_profile.get('name', 'Teacher')}, a {base_module.get('competency_area', 'teaching')} trainer in {cluster_context.get('location', 'rural India')}.

**CONTEXT:**
Teacher: {teacher_profile.get('name')} | Cluster: {cluster_context.get('location')} | Issue: {cluster_context.get('common_issues', 'classroom challenges')[:80]}
Language: {primary_language} | Infrastructure: {cluster_context.get('infrastructure', 'Basic - no tech')} | Students: {cluster_context.get('class_size', '40-50')} with 2-3 year skill gaps

{content_source}

**MODULE:** {base_module.get('title')} ({base_module.get('competency_area')})

---
THE MOST IMPORTANT RULE IS NOT USE MARKDOWN FORMAT OR TO SPEAK OUT THE SECTION TITLES. MAKE IT POINT WISE
**CREATE 7 SECTIONS (Plain text, no markdown):**

1. YOUR SITUATION (2 sentences)
   Connect their issue to this training

2. KEY IDEAS (4-5 points)
   - Simple dashes, translate jargon to {primary_language} (English), tie to training content

3. CLASSROOM EXAMPLE
   Show a teacher in {cluster_context.get('location')} using this with 40+ mixed-level students, zero resources. Step-by-step.

4. DO THIS TOMORROW (5-6 steps)
   Number clearly. Only chalkboard/notebooks/free materials. Include timing. Address different skill levels.

5. QUICK WINS (3 tips)
   Implementable TODAY, results in 1 week

6. MIXED-LEVEL TIP
   One peer-learning strategy for 40-50 students with skill gaps

7. REFLECT (2 questions)
   Help teacher apply concepts to their students

**RULES:**
- NO tech/printing/money in any suggestion
- Every activity works for 40-50 students, mixed abilities
- Use {primary_language} terms for key concepts (English translation)
- Examples from {cluster_context.get('location')} culture
- Keep paragraphs ≤3 sentences
- Total reading: <10 min
- Tone: colleague advice, not lecture

Begin:"""

    def generate_feedback_questions(self, training_module, teacher_profile, cluster_context):
        """Generate 4 contextual feedback questions for training_feedback table"""
        
        language = teacher_profile.get('preferred_language', 'en')
        lang_map = {'en': 'English', 'hi': 'Hindi', 'kn': 'Kannada'}
        
        prompt = f"""Generate 4 feedback questions ({lang_map.get(language, 'English')}) for "{training_module.get('title')}" training.

Context: {cluster_context.get('location')} | {cluster_context.get('infrastructure', 'Basic infrastructure')} | {cluster_context.get('common_issues', 'Mixed levels')}

Assess:
1. Zero-resource implementation success
2. Mixed-level classroom effectiveness  
3. Cultural fit
4. Barriers and solutions

Format: Numbered 1-4, <15 words each, plain text."""

        try:
            response = self.model.generate_content(prompt)
            questions = [q.strip() for q in response.text.strip().split('\n') if q.strip()]
            return {
                'success': True,
                'questions': questions[:4],  # Ensure only 4 questions
                'language': language
            }
        except Exception as e:
            # Fallback questions for training_feedback table
            return {
                'success': False,
                'error': str(e),
                'questions': [
                    "Which strategies did you implement?",
                    "How did different student levels respond?",
                    "What challenges did you face?",
                    "What worked well in your context?"
                ],
                'language': 'en'
            }

# ==================== INITIALIZATION ====================

personalizer = ContentPersonalizer()
