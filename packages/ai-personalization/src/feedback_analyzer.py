from typing import List, Dict, Optional
from supabase_client import db

class FeedbackAnalyzer:
    """Analyzes teacher feedback to identify competency gaps"""
    
    def __init__(self):
        self.mappings = self._load_mappings()
        print(f"✓ Loaded {len(self.mappings)} keyword mappings from database")
        if not self.mappings:
            print(f"⚠️ WARNING: No mappings loaded. Initializing defaults...")
            db.initialize_default_mappings()
            self.mappings = self._load_mappings()
            print(f"✓ Now have {len(self.mappings)} mappings")
    
    def _load_mappings(self) -> List[Dict]:
        """Load issue keyword mappings from database"""
        return db.get_issue_competency_mappings()
    
    # ✅ NEW: Analyze SINGLE feedback item
    def analyze_single_feedback(self, feedback_id: str) -> Dict:
        """
        Analyze a SINGLE feedback item (not accumulated history)
        This prevents bias from historical feedback.
        
        Returns:
            {
                'feedback_id': str,
                'teacher_id': str,
                'inferred_gaps': List[str],
                'gap_scores': Dict[str, float],
                'issue_text': str,
                'matched_competencies': Dict[str, float]
            }
        """
        print(f"\n{'='*80}")
        print(f"ANALYZING SINGLE FEEDBACK ITEM: {feedback_id}")
        print(f"{'='*80}")
        
        # Fetch ONLY this specific feedback item
        feedback_item = db.get_feedback_by_id(feedback_id)
        
        if not feedback_item:
            print(f"❌ Feedback {feedback_id} not found")
            return {
                'feedback_id': feedback_id,
                'error': 'Feedback not found',
                'inferred_gaps': [],
                'gap_scores': {},
                'matched_competencies': {}
            }
        
        teacher_id = feedback_item['teacher_id']
        issue_text = feedback_item['description'].lower()
        
        print(f"\nTeacher ID: {teacher_id}")
        print(f"Issue: \"{feedback_item['description'][:80]}...\"")
        print(f"Category: {feedback_item.get('category', 'unknown')}")
        
        # Match THIS issue to competencies
        matched_competencies = self._match_issue_to_gaps(issue_text)
        
        print(f"\n{'-'*80}")
        print(f"MATCHED COMPETENCIES FOR THIS ISSUE:")
        print(f"{'-'*80}")
        
        if matched_competencies:
            for competency, confidence in matched_competencies.items():
                competency_display = competency.replace('_', ' ').title()
                print(f"  ✓ {competency_display}: {confidence:.2f}")
        else:
            print(f"  ⚠️ No keyword matches found for this issue")
            print(f"  ACTION: Add keywords to issue_competency_mapping table")
        
        # Select the TOP competency gap (highest confidence)
        if matched_competencies:
            top_gap = max(matched_competencies.items(), key=lambda x: x[1])
            inferred_gaps = [top_gap[0]]
            print(f"\n🎯 SELECTED GAP: {top_gap[0]} (confidence: {top_gap[1]:.2f})")
        else:
            # Fallback to classroom_management if no matches
            inferred_gaps = ['classroom_management']
            print(f"\n🎯 FALLBACK GAP: classroom_management (no keywords matched)")
        
        print(f"{'='*80}\n")
        
        return {
            'feedback_id': feedback_id,
            'teacher_id': teacher_id,
            'inferred_gaps': inferred_gaps,
            'gap_scores': matched_competencies,
            'issue_text': feedback_item['description'],
            'matched_competencies': matched_competencies
        }
    
    # ✅ KEEP THIS for historical analysis/reporting (but not for training assignment)
    def analyze_teacher_feedback(self, teacher_id: str) -> Dict:
        """
        Analyze ALL feedback from a teacher (for reporting/analytics only)
        WARNING: Do NOT use this for training assignment - use analyze_single_feedback instead
        """
        print(f"\n{'='*80}")
        print(f"ANALYZING ALL FEEDBACK FOR TEACHER: {teacher_id}")
        print(f"(NOTE: This is for analytics only, not training assignment)")
        print(f"{'='*80}")
        
        feedback_items = db.get_teacher_feedback(teacher_id)
        print(f"\nFound {len(feedback_items)} feedback items")
        
        if not feedback_items:
            print(f"No feedback found for teacher {teacher_id}")
            return {
                'teacher_id': teacher_id,
                'total_issues': 0,
                'inferred_gaps': [],
                'priority': 'low',
                'gap_scores': {},
                'issue_summary': []
            }
        
        gap_scores = {
            'classroom_management': 0,
            'content_knowledge': 0,
            'pedagogy': 0,
            'technology_usage': 0,
            'student_engagement': 0
        }
        
        unmatched_issues = []
        issue_summary = []
        
        print(f"\nANALYZING EACH FEEDBACK ITEM:")
        print(f"{'-'*80}")
        
        for idx, item in enumerate(feedback_items, 1):
            issue_text = item['description'].lower()
            matched_gaps = self._match_issue_to_gaps(issue_text)
            
            print(f"\n{idx}. Issue: \"{item['description'][:60]}...\"")
            
            if matched_gaps:
                print(f"   Matched Competencies:")
                for gap, confidence in matched_gaps.items():
                    gap_scores[gap] += confidence
                    gap_display = gap.replace('_', ' ').title()
                    print(f"   - {gap_display}: confidence {confidence}")
            else:
                print(f"   UNMATCHED: No competency keywords found")
                unmatched_issues.append(item['description'])
            
            issue_summary.append({
                'issue': item['description'],
                'category': item.get('category', 'unknown'),
                'status': item['status'],
                'matched_competencies': list(matched_gaps.keys()),
                'created_at': item['created_at']
            })
        
        print(f"\n{'-'*80}")
        print(f"ACCUMULATED SCORES (from all feedback):")
        for competency, score in gap_scores.items():
            competency_display = competency.replace('_', ' ').title()
            print(f"  {competency_display}: {score:.2f}")
        
        if len(feedback_items) >= 5:
            priority = 'high'
        elif len(feedback_items) >= 3:
            priority = 'medium'
        else:
            priority = 'low'
        
        print(f"\nPRIORITY LEVEL: {priority.upper()}")
        print(f"{'='*80}\n")
        
        return {
            'teacher_id': teacher_id,
            'total_issues': len(feedback_items),
            'gap_scores': gap_scores,
            'unmatched_feedback_count': len(unmatched_issues),
            'priority': priority,
            'issue_summary': issue_summary[:5]
        }
    
    def _match_issue_to_gaps(self, issue_text: str) -> Dict[str, float]:
        """
        Match issue text to competency gaps using keyword mappings
        Returns: {'competency_area': confidence_score}
        """
        matched_gaps = {}
        matched_keywords = []
        
        for mapping in self.mappings:
            keyword = mapping['issue_keyword'].lower()
            if keyword in issue_text:
                competency = mapping['competency_area']
                confidence = float(mapping['confidence_score'])
                
                matched_keywords.append({
                    'keyword': keyword,
                    'competency': competency,
                    'confidence': confidence
                })
                
                # Keep the HIGHEST confidence for each competency
                if competency in matched_gaps:
                    matched_gaps[competency] = max(matched_gaps[competency], confidence)
                else:
                    matched_gaps[competency] = confidence
        
        return matched_gaps
    
    def create_assessment_from_single_feedback(self, feedback_id: str) -> Dict:
        """
        Create assessment scores based on a SINGLE feedback item
        Returns: Assessment scores (0-10 scale)
        """
        analysis = self.analyze_single_feedback(feedback_id)
        
        if 'error' in analysis:
            return {}
        
        matched_competencies = analysis.get('matched_competencies', {})
        
        baseline_no_issue = 7  # Neutral score for competencies not mentioned
        baseline_with_issue = 7  # Starting score for competencies with issues
        
        assessment_scores = {}
        
        print(f"\nAssessment Score Calculation (from single feedback):")
        print(f"{'-'*80}")
        
        for competency in ['classroom_management', 'content_knowledge', 'pedagogy',
                           'technology_usage', 'student_engagement']:
            
            if competency in matched_competencies:
                # Competency has an issue - penalize based on confidence
                confidence = matched_competencies[competency]
                penalty = confidence * 5  # Scale confidence to 0-5 penalty
                adjusted_score = max(0, min(10, baseline_with_issue - penalty))
                assessment_scores[competency] = int(adjusted_score)
                
                competency_display = competency.replace('_', ' ').title()
                print(f"{competency_display}:")
                print(f"  - Issue detected (confidence: {confidence:.2f})")
                print(f"  - Score: {adjusted_score:.0f}/10 (baseline {baseline_with_issue} - penalty {penalty:.1f})")
            else:
                # No issue mentioned - neutral score
                assessment_scores[competency] = baseline_no_issue
                competency_display = competency.replace('_', ' ').title()
                print(f"{competency_display}: {baseline_no_issue}/10 (no issue)")
        
        print(f"{'-'*80}\n")
        
        return assessment_scores

# Initialize analyzer
feedback_analyzer = FeedbackAnalyzer()

