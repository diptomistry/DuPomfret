"""
Community Service with Bot Support
Handles posts, comments, and AI-generated grounded replies
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from app.core.supabase import supabase
from app.utils.embeddings import get_text_embedding
from app.vectorstore.repository import VectorRepository
from app.rag.service import RAGService

logger = logging.getLogger(__name__)


class CommunityService:
    """Service for community posts, comments, and bot support"""
    
    # System bot user ID - should be created in database as a special user
    SYSTEM_BOT_USER_ID = "00000000-0000-0000-0000-000000000001"
    
    def __init__(self):
        self.supabase = supabase
        self.vector_repo = VectorRepository()
        self.rag_service = RAGService()
    
    # ==================== POSTS ====================
    
    async def create_post(
        self,
        user_id: str,
        title: str,
        content: str,
        course_id: Optional[str] = None,
        tags: List[str] = None,
        category: str = 'question'
    ) -> Dict:
        """Create a new community post"""
        try:
            post_data = {
                "id": str(uuid4()),
                "author_id": user_id,
                "title": title,
                "body": content,
                "course_id": course_id,
                "tags": tags or [],
                "category": category,
                "visibility": "course" if course_id else "global",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("community_posts").insert(post_data).execute()
            logger.info(f"Created post {post_data['id']}")
            return result.data[0]
        except Exception as e:
            logger.error(f"Error creating post: {str(e)}")
            raise
    
    async def get_posts(
        self,
        course_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict]:
        """Get community posts with filters"""
        try:
            query = self.supabase.table("community_posts").select("*, users!community_posts_author_id_fkey(display_name)")
            
            if course_id:
                query = query.eq("course_id", course_id)
            
            query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
            result = query.execute()
            
            return result.data
        except Exception as e:
            logger.error(f"Error fetching posts: {str(e)}")
            raise
    
    async def get_post_by_id(self, post_id: str) -> Optional[Dict]:
        """Get a specific post by ID"""
        try:
            result = self.supabase.table("community_posts")\
                .select("*, users!community_posts_author_id_fkey(display_name)")\
                .eq("id", post_id)\
                .single()\
                .execute()
            
            return result.data
        except Exception as e:
            logger.error(f"Error fetching post {post_id}: {str(e)}")
            return None
    
    async def update_post(
        self,
        post_id: str,
        user_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        tags: Optional[List[str]] = None,
        is_resolved: Optional[bool] = None
    ) -> Dict:
        """Update a post"""
        try:
            update_data = {"updated_at": datetime.utcnow().isoformat()}
            
            if title:
                update_data["title"] = title
            if content:
                update_data["content"] = content
            if tags is not None:
                update_data["tags"] = tags
            if is_resolved is not None:
                update_data["is_resolved"] = is_resolved
            
            result = self.supabase.table("community_posts")\
                .update(update_data)\
                .eq("id", post_id)\
                .eq("user_id", user_id)\
                .execute()
            
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating post: {str(e)}")
            raise
    
    async def delete_post(self, post_id: str, user_id: str) -> bool:
        """Delete a post"""
        try:
            self.supabase.table("community_posts")\
                .delete()\
                .eq("id", post_id)\
                .eq("author_id", user_id)\
                .execute()
            
            logger.info(f"Deleted post {post_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting post: {str(e)}")
            raise
    
    # ==================== COMMENTS ====================
    
    async def create_comment(
        self,
        post_id: str,
        user_id: str,
        content: str,
        parent_comment_id: Optional[str] = None,
        intended_receiver_id: Optional[str] = None
    ) -> Dict:
        """Create a comment on a post"""
        try:
            comment_data = {
                "id": str(uuid4()),
                "post_id": post_id,
                "author_id": user_id,
                "body": content,
                "parent_comment_id": parent_comment_id,
                "intended_receiver_id": intended_receiver_id,
                "is_bot": False,
                "is_auto_reply": False,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("community_comments").insert(comment_data).execute()
            comment = result.data[0]
            
            # Check if intended receiver is unavailable and trigger bot reply
            if intended_receiver_id:
                await self._check_and_generate_bot_reply(post_id, comment['id'], intended_receiver_id)
            
            logger.info(f"Created comment {comment['id']}")
            return comment
        except Exception as e:
            logger.error(f"Error creating comment: {str(e)}")
            raise
    
    async def get_comments(
        self,
        post_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """Get comments for a post"""
        try:
            result = self.supabase.table("community_comments")\
                .select("*, users!community_comments_author_id_fkey(display_name)")\
                .eq("post_id", post_id)\
                .order("created_at", desc=False)\
                .limit(limit)\
                .execute()
            
            return result.data
        except Exception as e:
            logger.error(f"Error fetching comments: {str(e)}")
            raise
    
    async def update_comment(
        self,
        comment_id: str,
        user_id: str,
        content: str
    ) -> Dict:
        """Update a comment"""
        try:
            result = self.supabase.table("community_comments")\
                .update({
                    "body": content
                })\
                .eq("id", comment_id)\
                .eq("author_id", user_id)\
                .eq("is_bot", False)\
                .execute()
            
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating comment: {str(e)}")
            raise
    
    async def delete_comment(self, comment_id: str, user_id: str) -> bool:
        """Delete a comment"""
        try:
            self.supabase.table("community_comments")\
                .delete()\
                .eq("id", comment_id)\
                .eq("author_id", user_id)\
                .eq("is_bot", False)\
                .execute()
            
            logger.info(f"Deleted comment {comment_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting comment: {str(e)}")
            raise
    
    # ==================== BOT SUPPORT ====================
    
    async def _check_and_generate_bot_reply(
        self,
        post_id: str,
        comment_id: str,
        intended_receiver_id: str
    ):
        """Check if intended receiver is unavailable and generate bot reply"""
        try:
            # Check if user has been active recently (e.g., in last 30 minutes)
            is_available = await self._check_user_availability(intended_receiver_id)
            
            if not is_available:
                logger.info(f"User {intended_receiver_id} unavailable, generating bot reply")
                await self.generate_bot_reply(post_id, comment_id)
        except Exception as e:
            logger.error(f"Error checking user availability: {str(e)}")
    
    async def _check_user_availability(self, user_id: str) -> bool:
        """Check if user is currently available (simplified - can be enhanced)"""
        try:
            # Check if user has any recent activity (last 30 min)
            # This is a simple check - can be enhanced with real-time presence
            threshold_time = datetime.utcnow() - timedelta(minutes=30)
            
            result = self.supabase.table("community_comments")\
                .select("created_at")\
                .eq("author_id", user_id)\
                .gte("created_at", threshold_time.isoformat())\
                .limit(1)\
                .execute()
            
            # For now, assume user is unavailable (to always trigger bot)
            # In production, implement proper presence detection
            return False
        except Exception as e:
            logger.error(f"Error checking availability: {str(e)}")
            return False
    
    async def generate_bot_reply(
        self,
        post_id: str,
        parent_comment_id: str
    ) -> Dict:
        """Generate a grounded bot reply using RAG"""
        try:
            # Get the post and parent comment context
            post = await self.get_post_by_id(post_id)
            
            parent_result = self.supabase.table("community_comments")\
                .select("*")\
                .eq("id", parent_comment_id)\
                .single()\
                .execute()
            parent_comment = parent_result.data
            
            # Construct question from post and comment
            question = f"{post['title']}\n\n{post['body']}\n\nComment: {parent_comment['body']}"
            
            # Use RAG to get grounded answer
            course_id = post.get('course_id')
            if course_id:
                rag_response = await self.rag_service.query_for_course(
                    course_id=course_id,
                    question=question,
                    top_k=3
                )
            else:
                # If no course specified, use general knowledge with disclaimer
                rag_response = {
                    "answer": "I don't have specific course materials to reference for this question. Please specify a course or wait for a human response.",
                    "sources": []
                }
            
            # Format bot reply with sources
            bot_content = self._format_bot_reply(rag_response)
            
            # Create bot comment
            bot_comment_data = {
                "id": str(uuid4()),
                "post_id": post_id,
                "author_id": None,  # Bot comments don't have a user author
                "body": bot_content,
                "parent_comment_id": parent_comment_id,
                "is_bot": True,
                "is_auto_reply": True,
                "auto_reply_reason": "manual_request",
                "grounding_metadata": rag_response.get("sources", []),
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("community_comments").insert(bot_comment_data).execute()
            
            logger.info(f"Generated bot reply {bot_comment_data['id']}")
            return result.data[0]
        except Exception as e:
            logger.error(f"Error generating bot reply: {str(e)}")
            raise
    
    def _format_bot_reply(self, rag_response: Dict) -> str:
        """Format bot reply with answer and sources"""
        answer = rag_response.get("answer", "")
        sources = rag_response.get("sources", [])
        
        reply = f"🤖 **AI Assistant Reply** (Auto-generated)\n\n{answer}"
        
        if sources:
            reply += "\n\n📚 **Sources:**\n"
            for i, source in enumerate(sources[:3], 1):
                metadata = source.get("metadata", {})
                source_type = metadata.get("content_type", "document")
                topic = metadata.get("topic", "N/A")
                reply += f"{i}. {source_type.title()} - Topic: {topic}\n"
        
        reply += "\n\n*This is an automated response. A human may provide additional context.*"
        
        return reply
