import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from supabase_client import db

class CompetencyAnalyzer:
    def __init__(self, n_clusters=5):
        self.n_clusters = n_clusters
        self.scaler = StandardScaler()
        self.kmeans = None
    
    def analyze_teacher_gap(self, teacher_id):
        """
        Analyze individual teacher's competency gaps
        Returns: dict with gap areas, priority, recommended modules
        """
        print(f"\n{'='*80}")
        print(f"ANALYZING COMPETENCY GAPS FOR TEACHER: {teacher_id}")
        print(f"{'='*80}")
        
        # Fetch teacher's latest assessment
        assessment = db.get_teacher_assessments(teacher_id)
        
        if not assessment:
            print(f"ERROR: No assessment data found for teacher {teacher_id}")
            return {
                'teacher_id': teacher_id,
                'error': 'No assessment data found',
                'gap_areas': [],
                'priority': 'unknown',
                'recommended_modules': []
            }
        
        # Extract competency scores
        features = self._extract_features(assessment)
        
        # Display all competency scores
        print(f"\nCOMPETENCY SCORES (Scale: 0-10, Gap threshold: < 5)")
        print(f"{'-'*80}")
        
        competency_map = {
            'classroom_management': assessment.get('classroom_management_score', 0),
            'content_knowledge': assessment.get('content_knowledge_score', 0),
            'pedagogy': assessment.get('pedagogy_score', 0),
            'technology_usage': assessment.get('technology_usage_score', 0),
            'student_engagement': assessment.get('student_engagement_score', 0)
        }
        
        # Identify weak areas with visual indicators
        gap_areas = []
        
        for competency, score in competency_map.items():
            # Visual indicator based on score
            if score < 3:
                indicator = "CRITICAL"
                status = "GAP"
            elif score < 5:
                indicator = "LOW"
                status = "GAP"
            elif score < 7:
                indicator = "OK"
                status = "OK"
            else:
                indicator = "STRONG"
                status = "OK"
            
            # Format competency name
            competency_display = competency.replace('_', ' ').title()
            
            # Print score with indicator
            print(f"  {indicator}  {competency_display:.<40} {score:>4.1f}/10  [{status}]")
            
            # Add to gap areas if below threshold
            if score < 5:
                gap_areas.append(competency)
        
        print(f"{'-'*80}")
        
        # Display identified gaps
        if gap_areas:
            print(f"\nIDENTIFIED COMPETENCY GAPS: {len(gap_areas)}")
            for i, gap in enumerate(gap_areas, 1):
                gap_display = gap.replace('_', ' ').title()
                score = competency_map[gap]
                print(f"   {i}. {gap_display} (Score: {score}/10)")
        else:
            print(f"\nNO COMPETENCY GAPS FOUND - All scores above threshold!")
        
        # Determine priority based on number of gaps
        if len(gap_areas) >= 3:
            priority = 'high'
            priority_icon = ""
        elif len(gap_areas) == 2:
            priority = 'medium'
            priority_icon = ""
        else:
            priority = 'low'
            priority_icon = ""
        
        print(f"\n{priority_icon} PRIORITY LEVEL: {priority.upper()}")
        
        # Map gaps to training modules
        recommended_modules = self._recommend_modules(gap_areas)
        
        # Display recommended modules
        if recommended_modules:
            print(f"\nRECOMMENDED TRAINING MODULES: {len(recommended_modules)}")
            for i, module in enumerate(recommended_modules, 1):
                print(f"   {i}. {module}")
        else:
            print(f"\nNO MODULES RECOMMENDED - Teacher performing well!")
        
        result = {
            'teacher_id': teacher_id,
            'gap_areas': gap_areas,
            'priority': priority,
            'recommended_modules': recommended_modules,
            'scores': competency_map
        }
        
        # Save to Supabase
        print(f"\nSaving gap analysis to database...")
        db.save_gap_analysis(teacher_id, result)
        print(f"Analysis saved successfully!")
        
        print(f"{'='*80}\n")
        
        return result
    
    def analyze_cluster_gaps(self, cluster_id):
        """
        Analyze competency gaps for an entire cluster using K-Means
        Returns: dict with cluster insights and teacher groupings
        """
        print(f"\n{'='*80}")
        print(f"ANALYZING CLUSTER GAPS FOR: {cluster_id}")
        print(f"{'='*80}")
        
        # Fetch all teachers in cluster
        teachers = db.get_teachers_by_cluster(cluster_id)
        
        print(f"\nFound {len(teachers)} teachers in cluster")
        
        if len(teachers) < self.n_clusters:
            print(f"ERROR: Not enough teachers for clustering (need at least {self.n_clusters})")
            return {'error': 'Not enough teachers for clustering'}
        
        # Collect assessment data
        feature_matrix = []
        teacher_ids = []
        
        print(f"\nCollecting assessment data...")
        for teacher in teachers:
            assessment = db.get_teacher_assessments(teacher['id'])
            if assessment:
                features = self._extract_features(assessment)
                feature_matrix.append(features)
                teacher_ids.append(teacher['id'])
                print(f"  {teacher['id']}: Assessment found")
            else:
                print(f"  {teacher['id']}: No assessment data")
        
        if len(feature_matrix) < self.n_clusters:
            print(f"ERROR: Insufficient assessment data")
            return {'error': 'Insufficient assessment data'}
        
        print(f"\nSuccessfully collected data for {len(feature_matrix)} teachers")
        
        # Normalize features
        X = np.array(feature_matrix)
        X_scaled = self.scaler.fit_transform(X)
        
        # Apply K-Means clustering
        print(f"\nRunning K-Means clustering (k={self.n_clusters})...")
        self.kmeans = KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10)
        cluster_labels = self.kmeans.fit_predict(X_scaled)
        print(f"Clustering complete!")
        
        # Group teachers by cluster
        cluster_groups = {}
        for i, label in enumerate(cluster_labels):
            if label not in cluster_groups:
                cluster_groups[label] = []
            cluster_groups[label].append({
                'teacher_id': teacher_ids[i],
                'features': feature_matrix[i].tolist()
            })
        
        # Identify common gaps per cluster
        print(f"\nCLUSTER ANALYSIS RESULTS:")
        print(f"{'-'*80}")
        
        cluster_insights = {}
        for label, group in cluster_groups.items():
            avg_scores = np.mean([t['features'] for t in group], axis=0)
            
            print(f"\nCLUSTER {label} ({len(group)} teachers)")
            print(f"   Teachers: {', '.join([t['teacher_id'] for t in group][:5])}")
            if len(group) > 5:
                print(f"   ... and {len(group) - 5} more")
            
            print(f"\n   Average Competency Scores:")
            
            scores_dict = {
                'classroom_management': round(avg_scores[0], 2),
                'content_knowledge': round(avg_scores[1], 2),
                'pedagogy': round(avg_scores[2], 2),
                'technology_usage': round(avg_scores[3], 2),
                'student_engagement': round(avg_scores[4], 2)
            }
            
            # Visual display of cluster competencies
            for competency, score in scores_dict.items():
                if score < 5:
                    indicator = "GAP"
                elif score < 7:
                    indicator = "OK"
                else:
                    indicator = "STRONG"
                
                competency_display = competency.replace('_', ' ').title()
                print(f"     {indicator}  {competency_display:.<35} {score:>4.1f}/10")
            
            cluster_insights[f'cluster_{label}'] = {
                'teacher_count': len(group),
                'average_scores': scores_dict,
                'teachers': [t['teacher_id'] for t in group]
            }
        
        print(f"\n{'='*80}\n")
        
        return {
            'cluster_id': cluster_id,
            'total_teachers': len(teachers),
            'clusters': cluster_insights
        }
    
    def _extract_features(self, assessment):
        """Convert assessment dict to feature vector"""
        return np.array([
            assessment.get('classroom_management_score', 0),
            assessment.get('content_knowledge_score', 0),
            assessment.get('pedagogy_score', 0),
            assessment.get('technology_usage_score', 0),
            assessment.get('student_engagement_score', 0)
        ])
    
    def _recommend_modules(self, gap_areas):
        """Map competency gaps to training module IDs"""
        module_map = {
            'classroom_management': ['behavior_mgmt_101', 'discipline_strategies'],
            'content_knowledge': ['subject_mastery', 'curriculum_design'],
            'pedagogy': ['active_learning_methods', 'differentiated_instruction'],
            'technology_usage': ['digital_tools_basics', 'online_teaching'],
            'student_engagement': ['parent_communication', 'motivation_techniques']
        }
        
        modules = []
        for gap in gap_areas:
            modules.extend(module_map.get(gap, []))
        
        return list(set(modules))  # Remove duplicates

# Initialize analyzer
analyzer = CompetencyAnalyzer(n_clusters=5)
