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
    Personalizes training content for teachers based on:
    1. RAG-retrieved PDF chunks (primary source)
    2. Local Language and Culture
    3. Poor School Facilities
    4. Mixed-Level Classrooms
    """
    
    def __init__(self):
        generation_config = {
            "temperature": 0.7,
            "response_mime_type": "text/plain"
        }
        self.model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config=generation_config
        )
    
    def personalize_training_module(self, base_module, teacher_profile, cluster_context, rag_chunks=None):
        """
        Adapt training content using RAG chunks as primary source material
        
        Args:
            base_module: dict with 'title', 'content', 'competency_area'
            teacher_profile: dict with 'name', 'subject', 'experience', 'gap_areas'
            cluster_context: dict with 'location', 'common_issues', 'language', 'infrastructure'
            rag_chunks: list of dicts with 'text', 'page', 'score' (from RAG retrieval)
        
        Returns:
            dict with personalized content and adaptation metadata
        """
        
        prompt = self._build_personalization_prompt(
            base_module, 
            teacher_profile, 
            cluster_context,
            rag_chunks
        )
        
        try:
            response = self.model.generate_content(prompt)
            personalized_content = response.text
            
            return {
                'success': True,
                'personalized_content': personalized_content,
                'original_module_id': base_module.get('id'),
                'estimated_duration': '10-15 minutes',
                'rag_chunks_used': len(rag_chunks) if rag_chunks else 0,
                'adaptations_made': {
                    'language_culture': {
                        'primary_language': cluster_context.get('language', 'Hindi'),
                        'local_dialect': cluster_context.get('dialect', 'Standard'),
                        'cultural_context': cluster_context.get('location', 'Rural India')
                    },
                    'facility_adaptations': {
                        'infrastructure_level': cluster_context.get('infrastructure', 'Basic'),
                        'no_tech_alternatives': True,
                        'low_resource_strategies': True
                    },
                    'classroom_management': {
                        'mixed_levels': True,
                        'differentiation_strategies': True,
                        'classroom_size': cluster_context.get('class_size', 'Medium')
                    },
                    'gap_focused': teacher_profile.get('gap_areas', [])
                }
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'personalized_content': base_module.get('content'),
                'estimated_duration': '10-15 minutes'
            }
    
    def _build_personalization_prompt(self, base_module, teacher_profile, cluster_context, rag_chunks=None):
        """Build comprehensive prompt using RAG chunks as primary source"""
        
        # Format RAG chunks if available
        rag_content_section = ""
        if rag_chunks and len(rag_chunks) > 0:
            rag_content_section = "\n\n**TRAINING MODULE CONTENT (from official materials):**\n"
            for i, chunk in enumerate(rag_chunks[:5], 1):  # Top 5 chunks
                rag_content_section += f"\n[Section {i} - Page {chunk.get('page', 'N/A')}]:\n{chunk.get('text', '')}\n"
            rag_content_section += "\n^ USE THIS CONTENT AS YOUR PRIMARY SOURCE. Adapt and simplify it for the teacher's context below.\n"
        else:
            # Fallback to module description if no RAG chunks
            rag_content_section = f"\n\n**BASE TRAINING CONTENT:**\n{base_module.get('description', 'No content available')}\n"
        
        return f"""You are an expert educational content designer specializing in teacher professional development for diverse Indian school contexts.

**TEACHER PROFILE:**
- Name: {teacher_profile.get('name', 'Teacher')}
- Subject: {teacher_profile.get('subject', 'General')}
- Teaching Experience: {teacher_profile.get('experience', 'Unknown')} years
- Current Competency Gaps: {', '.join(teacher_profile.get('gap_areas', ['General Teaching']))}
- Current Issue/Challenge: {cluster_context.get('common_issues', 'Teaching effectiveness')}

**SCHOOL/CLUSTER CONTEXT:**
- Location: {cluster_context.get('location', 'Rural India')}
- Primary Language: {cluster_context.get('language', 'Hindi')}
- Local Dialect: {cluster_context.get('dialect', 'Regional variation')}
- Infrastructure Level: {cluster_context.get('infrastructure', 'Basic - no projector, limited electricity, no internet')}
- Classroom Size: {cluster_context.get('class_size', '40-50 students')}

{rag_content_section}

**TRAINING MODULE:**
Title: {base_module.get('title', 'Untitled')}
Competency Area: {base_module.get('competency_area', 'General Teaching')}

---

**YOUR TASK:**
Transform the training content above into a personalized, actionable guide for THIS SPECIFIC TEACHER that addresses their real classroom challenges.

**CRITICAL ADAPTATIONS REQUIRED:**

**1. LOCAL LANGUAGE AND CULTURE**
- Use simple {cluster_context.get('language', 'Hindi')} phrases where helpful (with English translations in parentheses)
- Examples must be from {cluster_context.get('location', 'local area')} context
- Reference familiar scenarios (local festivals, community practices, regional teaching styles)

**2. ZERO-RESOURCE IMPLEMENTATION**
- EVERY suggestion must work with NO technology, NO printed materials, NO budget
- Only use: chalkboard, student notebooks, recycled materials, outdoor space
- Design for limited/no electricity
- Activities should use local, free materials only

**3. MIXED-LEVEL CLASSROOM STRATEGIES**
- Address 2-3 year skill gaps among 40-50 students
- Include peer-learning techniques (advanced helping struggling students)
- Provide quick differentiation methods requiring <5 minutes prep
- Ensure all students can participate meaningfully

**CONTENT STRUCTURE (USE PLAIN TEXT - NO MARKDOWN SYMBOLS):**

1. DIRECT CONNECTION (2-3 sentences)
   - Acknowledge their specific issue: {cluster_context.get('common_issues', 'teaching challenge')[:100]}
   - Show how this training helps their exact situation

2. CORE CONCEPTS (5-6 key points)
   - Use simple dashes for bullet points (-)
   - Each point drawn from the training material above
   - Translate jargon into simple {cluster_context.get('language', 'local language')} + English
   - Connect to their classroom reality

3. REAL CLASSROOM SCENARIO
   - Set in {cluster_context.get('location', 'their cluster')}
   - Show a teacher facing similar issue with 40+ mixed-level students
   - Demonstrate the technique from training material with ZERO resources
   - Include what teacher says/does step-by-step

4. ACTIONABLE STEPS (6-8 steps)
   - Number clearly (1., 2., 3., etc.)
   - Each implementable TOMORROW with what they have
   - Include timing (This takes 5 minutes, This needs 10 minutes prep, etc.)
   - Specify how to handle different skill levels
   - Reference the training content sections above

5. QUICK WINS (3-4 tips)
   - Immediate changes they can make TODAY
   - No preparation needed
   - Visible results within one week

6. MIXED-LEVEL MANAGEMENT TIP
   - One concrete peer-learning strategy from the training material
   - Works for groups of 40-50 with 2-3 year skill gaps

7. REFLECTION PROMPTS (2 questions)
   - Help teacher think about their specific students
   - Connect training concepts to their classroom

**CRITICAL REQUIREMENTS:**
- Draw ALL main concepts and strategies from the training content sections provided above
- Simplify academic language into teacher-friendly explanations
- Add {cluster_context.get('language', 'local language')} terms for key concepts (with English in parentheses)
- ZERO technology or purchased materials in any suggestion
- Every activity must work for 40-50 students with mixed abilities
- Keep total reading time under 10 minutes
- Make it feel personal, like advice from an experienced colleague

**AVOID:**
- Markdown formatting (**, ##, *, etc.)
- Generic advice not tied to the training material
- Anything requiring technology, printing, or money
- Assuming homogeneous student levels
- Long paragraphs (keep paragraphs to 3-4 sentences max)

Begin the personalized training content now:"""

    def generate_feedback_questions(self, training_module, teacher_profile, cluster_context):
        """
        Generate contextual feedback questions addressing the three key areas
        """
        prompt = f"""Generate 4 short feedback questions for a teacher who completed training on "{training_module.get('title', 'teaching strategies')}".

Teacher Context:
- Location: {cluster_context.get('location', 'Rural school')}
- Infrastructure: {cluster_context.get('infrastructure', 'Basic')}
- Classroom Challenge: {cluster_context.get('common_issues', 'Mixed skill levels')}

Questions should assess:
1. Implementation with zero resources
2. Effectiveness with mixed-level students
3. Cultural relevance to their context
4. Barriers faced and workarounds found

Return as plain text, numbered 1-4, each question on a new line. Keep questions under 15 words each."""

        try:
            response = self.model.generate_content(prompt)
            return {
                'success': True,
                'questions': response.text.strip().split('\n')
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'questions': [
                    "What strategies did you try implementing?",
                    "How did students at different levels respond?",
                    "What challenges did you face?",
                    "What worked well in your classroom?"
                ]
            }

# ==================== INITIALIZATION ====================

personalizer = ContentPersonalizer()
