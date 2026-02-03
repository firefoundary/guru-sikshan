import os
import pdfplumber
import chromadb
from chromadb.utils import embedding_functions
from typing import Dict, List, Optional
from pathlib import Path
from dotenv import load_dotenv

current_dir = Path(__file__).parent
dotenv_path = current_dir.parent.parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

class RAGModuleMatcher:
    """
    Replaces keyword-based matching with semantic search using ChromaDB + local embeddings
    """
    
    def __init__(self):
        chroma_db_path = Path(__file__).parent.parent / 'chroma_db'
        chroma_db_path.mkdir(exist_ok=True)
        
        self.chroma_client = chromadb.PersistentClient(path=str(chroma_db_path))
        
        self.sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        
        self.collection = self.chroma_client.get_or_create_collection(
            name="training_modules",
            embedding_function=self.sentence_transformer_ef,
            metadata={"description": "DIET training modules with local embeddings"}
        )
        
        print(f"RAG Module Matcher initialized with local embeddings")
        print(f"ChromaDB path: {chroma_db_path}")
        print(f"Existing chunks: {self.collection.count()}")
    
    def process_pdf_module(
        self, 
        pdf_path: str, 
        module_id: str, 
        module_name: str, 
        competency_area: str
    ) -> int:
        """
        Process a PDF training module and store chunks in ChromaDB
        
        Args:
            pdf_path: Path to PDF file
            module_id: UUID of module in training_modules table
            module_name: Display name of module
            competency_area: One of: classroom_management, content_knowledge, pedagogy, etc.
        
        Returns:
            Number of chunks created
        """
        print(f"\n{'='*80}")
        print(f"PROCESSING PDF MODULE")
        print(f"{'='*80}")
        print(f"Module: {module_name}")
        print(f"PDF: {pdf_path}")
        print(f"Competency: {competency_area}")
        
        chunks = self._extract_and_chunk_pdf(pdf_path)
        print(f"Created {len(chunks)} chunks from PDF")
        
        documents = [chunk['text'] for chunk in chunks]
        metadatas = [
            {
                'module_id': module_id,
                'module_name': module_name,
                'competency_area': competency_area,
                'page': chunk['page'],
                'chunk_index': idx
            }
            for idx, chunk in enumerate(chunks)
        ]
        ids = [f"{module_id}_chunk_{idx}" for idx in range(len(chunks))]
        
        try:
            existing = self.collection.get(where={"module_id": module_id})
            if existing['ids']:
                self.collection.delete(ids=existing['ids'])
                print(f"Deleted {len(existing['ids'])} old chunks for module {module_id}")
        except Exception as e:
            print(f"No existing chunks to delete")
        
        print(f"Generating embeddings locally...")
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
        print(f"Stored {len(chunks)} chunks in ChromaDB")
        print(f"{'='*80}\n")
        return len(chunks)
    
    def find_best_module_for_feedback(
        self, 
        feedback_text: str, 
        competency_hint: Optional[str] = None,
        top_k: int = 5
    ) -> Dict:
        """
        Find the best training module for a teacher's feedback using semantic search
        
        Args:
            feedback_text: The teacher's issue description
            competency_hint: Optional competency filter
            top_k: Number of chunks to retrieve
        
        Returns:
            Dict with module_id, module_name, competency_area, confidence_score, relevant_chunks
        """
        print(f"\n{'='*80}")
        print(f"SEMANTIC MODULE SEARCH")
        print(f"{'='*80}")
        print(f"Feedback: \"{feedback_text[:100]}...\"")
        if competency_hint:
            print(f"Competency hint: {competency_hint}")
        
        where_filter = None
        if competency_hint:
            where_filter = {"competency_area": competency_hint}
        
        try:
            results = self.collection.query(
                query_texts=[feedback_text],
                n_results=top_k,
                where=where_filter
            )
        except Exception as e:
            print(f"ChromaDB query error: {e}")
            return {
                'error': 'Semantic search failed',
                'module_id': None,
                'confidence_score': 0
            }
        
        if not results['documents'][0]:
            print(f"No modules found in ChromaDB")
            return {
                'error': 'No training modules available',
                'module_id': None,
                'confidence_score': 0
            }
        
        module_scores = {}
        for idx, metadata in enumerate(results['metadatas'][0]):
            module_id = metadata['module_id']
            distance = results['distances'][0][idx]
            similarity = 1 - distance
            
            if module_id not in module_scores:
                module_scores[module_id] = {
                    'module_name': metadata['module_name'],
                    'competency_area': metadata['competency_area'],
                    'total_similarity': 0,
                    'chunk_count': 0,
                    'chunks': []
                }
            
            module_scores[module_id]['total_similarity'] += similarity
            module_scores[module_id]['chunk_count'] += 1
            module_scores[module_id]['chunks'].append({
                'text': results['documents'][0][idx],
                'page': metadata['page'],
                'similarity': similarity
            })
        
        best_module = max(
            module_scores.items(),
            key=lambda x: x[1]['total_similarity'] / x[1]['chunk_count']
        )
        
        module_id = best_module[0]
        module_data = best_module[1]
        avg_confidence = module_data['total_similarity'] / module_data['chunk_count']
        
        print(f"\nBEST MATCH FOUND:")
        print(f"Module: {module_data['module_name']}")
        print(f"Competency: {module_data['competency_area']}")
        print(f"Confidence: {avg_confidence:.2f}")
        print(f"Matched chunks: {module_data['chunk_count']}")
        print(f"{'='*80}\n")
        
        top_chunks = sorted(
            module_data['chunks'], 
            key=lambda x: x['similarity'], 
            reverse=True
        )[:3]
        
        return {
            'module_id': module_id,
            'module_name': module_data['module_name'],
            'competency_area': module_data['competency_area'],
            'confidence_score': float(avg_confidence),
            'relevant_chunks': top_chunks,
            'explanation': f"Matched based on semantic similarity to {module_data['chunk_count']} relevant sections"
        }
    
    def _extract_and_chunk_pdf(self, pdf_path: str, chunk_size: int = 800) -> List[Dict]:
        """
        Extract text from PDF and create semantic chunks using pdfplumber
        """
        chunks = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    
                    if not text:
                        continue
                    
                    import re
                    text = re.sub(r'\s+', ' ', text).strip()
                    sentences = re.split(r'(?<=[.!?])\s+', text)
                    
                    current_chunk = ""
                    for sentence in sentences:
                        if len(current_chunk.split()) + len(sentence.split()) > chunk_size:
                            if current_chunk:
                                chunks.append({
                                    'text': current_chunk.strip(),
                                    'page': page_num
                                })
                            current_chunk = sentence
                        else:
                            current_chunk += " " + sentence
                    
                    if current_chunk.strip():
                        chunks.append({
                            'text': current_chunk.strip(),
                            'page': page_num
                        })
        except Exception as e:
            print(f"PDF extraction error: {e}")
            raise
        
        return chunks
    
    def get_collection_stats(self) -> Dict:
        """Get statistics about stored modules"""
        total_chunks = self.collection.count()
        
        if total_chunks > 0:
            all_metadata = self.collection.get()
            modules = {}
            for metadata in all_metadata['metadatas']:
                module_id = metadata['module_id']
                if module_id not in modules:
                    modules[module_id] = {
                        'name': metadata['module_name'],
                        'competency': metadata['competency_area'],
                        'chunks': 0
                    }
                modules[module_id]['chunks'] += 1
        else:
            modules = {}
        
        return {
            'total_chunks': total_chunks,
            'total_modules': len(modules),
            'modules': modules
        }

rag_matcher = RAGModuleMatcher()
