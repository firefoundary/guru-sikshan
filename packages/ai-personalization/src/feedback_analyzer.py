import re
from typing import List, Dict
from supabase_client import db
from ml_engine import analyzer

class FeedbackAnalyzer:
    """Analyzes teacher feedback to identify competency gaps"""
    
    def __init__(self):
        self.mappings = self._load_mappings()
        print(f"Loaded {len(self.mappings)} keyword mappings from database")
    
    def _load_mappings(self) -> List[Dict]:
        """Load issue keyword mappings from database"""
        try:
            response = db.client.table('issue_competency_mapping').select('*').execute()
            return response.data
        except Exception as e:
            print(f"Error loading mappings: {e}")
            return []
    
    def analyze_teacher_feedback(self, teacher_id: str) -> Dict:
        """
        Analyze all feedback from a teacher to identify competency gaps
        Returns:
        {
            'teacher_id': str,
            'total_issues': int,
            'inferred_gaps': List[str],
            'priority': str,
            'issue_summary': List[Dict]
        }
        """
        print(f"\n{'='*80}")
        print(f"ANALYZING FEEDBACK FOR TEACHER: {teacher_id}")
        print(f"{'='*80}")
        
        try:
            response = db.client.table('feedback')\
                .select('*')\
                .eq('teacher_id', teacher_id)\
                .order('created_at', desc=True)\
                .execute()
            
            feedback_items = response.data
            print(f"\nFound {len(feedback_items)} feedback items")
            
        except Exception as e:
            print(f"Error fetching feedback: {e}")
            return {'error': str(e)}
        
        if not feedback_items:
            print(f"No feedback found for teacher {teacher_id}")
            return {
                'teacher_id': teacher_id,
                'total_issues': 0,
                'inferred_gaps': [],
                'priority': 'low',
                'issue_summary': []
            }
        
        gap_scores = {
            'classroom_management': 0,
            'content_knowledge': 0,
            'pedagogy': 0,
            'technology_usage': 0,
            'student_engagement': 0
        }
        
        issue_summary = []
        
        print(f"\n🔍 ANALYZING EACH FEEDBACK ITEM:")
        print(f"{'-'*80}")
        
        for idx, item in enumerate(feedback_items, 1):
            issue_text = item['description'].lower()
            matched_gaps = self._match_issue_to_gaps(issue_text)
            
            print(f"\n{idx}. Issue: \"{item['description'][:60]}...\"")
            
            if matched_gaps:
                print(f"Matched Competencies:")
                for gap, confidence in matched_gaps.items():
                    gap_scores[gap] += confidence
                    gap_display = gap.replace('_', ' ').title()
                    print(f"      - {gap_display}: confidence {confidence}")
            else:
                print(f"   No competency match found (check keyword mappings)")
            
            issue_summary.append({
                'issue': item['description'],
                'category': item.get('category', 'unknown'),
                'status': item['status'],
                'matched_competencies': list(matched_gaps.keys()),
                'created_at': item['created_at']
            })
        
        print(f"\n{'-'*80}")
        print(f"\nCOMPETENCY GAP SCORES:")
        print(f"{'-'*80}")
        
        for competency, score in gap_scores.items():
            competency_display = competency.replace('_', ' ').title()
            if score > 0:
                print(f"  {competency_display:.<40} {score:.1f}")
            else:
                print(f"  {competency_display:.<40} {score:.1f}")
        
        threshold = 0.7  
        inferred_gaps = [
            gap for gap, score in gap_scores.items()
            if score >= threshold
        ]
        
        print(f"\n{'-'*80}")
        print(f"GAPS ABOVE THRESHOLD ({threshold}):")
        if inferred_gaps:
            for gap in inferred_gaps:
                gap_display = gap.replace('_', ' ').title()
                print(f"  {gap_display} (Score: {gap_scores[gap]:.1f})")
        else:
            print(f"  No gaps found above threshold")
        
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
            'inferred_gaps': inferred_gaps,
            'gap_scores': gap_scores,
            'priority': priority,
            'issue_summary': issue_summary[:5] 
        }
    
    def analyze_cluster_feedback(self, cluster_id: str) -> Dict:
        """
        Analyze all feedback from a cluster to identify common issues
        """
        try:
            response = db.client.table('feedback')\
                .select('*')\
                .eq('cluster', cluster_id)\
                .execute()
            
            feedback_items = response.data
        except Exception as e:
            return {'error': str(e)}
        
        if not feedback_items:
            return {
                'cluster_id': cluster_id,
                'total_issues': 0,
                'common_issues': [],
                'affected_teachers': 0
            }
        
        issue_counts = {}
        teacher_ids = set()
        
        for item in feedback_items:
            issue = item['description']
            issue_counts[issue] = issue_counts.get(issue, 0) + 1
            teacher_ids.add(item['teacher_id'])
        
        common_issues = sorted(
            issue_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return {
            'cluster_id': cluster_id,
            'total_issues': len(feedback_items),
            'affected_teachers': len(teacher_ids),
            'common_issues': [
                {'description': issue, 'frequency': count}
                for issue, count in common_issues
            ]
        }
    
    def _match_issue_to_gaps(self, issue_text: str) -> Dict[str, float]:
        """
        Match issue text to competency gaps using keyword mappings
        Returns: {'competency_area': confidence_score}
        """
        matched_gaps = {}
        
        keywords_checked = []
        
        for mapping in self.mappings:
            keyword = mapping['issue_keyword'].lower()
            keywords_checked.append(keyword)
            
            if keyword in issue_text:
                competency = mapping['competency_area']
                confidence = float(mapping['confidence_score'])
                
                if competency in matched_gaps:
                    matched_gaps[competency] = max(matched_gaps[competency], confidence)
                else:
                    matched_gaps[competency] = confidence
        
        if not matched_gaps:
            print(f"   Checked keywords: {', '.join(keywords_checked[:10])}...")
        
        return matched_gaps
    
    def create_assessment_from_feedback(self, teacher_id: str) -> Dict:
        """
        Create a teacher assessment record based on feedback analysis
        This can be used when actual assessment data is missing
        Returns: Assessment scores (0-10 scale)
        """
        feedback_analysis = self.analyze_teacher_feedback(teacher_id)
        
        max_possible_score = 10.0
        gap_scores = feedback_analysis.get('gap_scores', {})

        baseline = 7
        assessment_scores = {}
        
        for competency, issue_score in gap_scores.items():
            adjusted_score = max(0, min(10, baseline - issue_score))
            assessment_scores[competency] = int(adjusted_score)
        
        for competency in ['classroom_management', 'content_knowledge', 'pedagogy',
                          'technology_usage', 'student_engagement']:
            if competency not in assessment_scores:
                assessment_scores[competency] = baseline
        
        return assessment_scores

# Initialize analyzer
feedback_analyzer = FeedbackAnalyzer()
