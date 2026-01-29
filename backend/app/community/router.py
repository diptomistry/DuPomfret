"""
API Router for Community & Bot Support
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import logging

from app.core.auth import get_current_user, User
from app.community.service import CommunityService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community", tags=["community"])


# ==================== Pydantic Models ====================

class PostCreate(BaseModel):
    title: str
    body: str
    course_id: Optional[str] = None
    tags: List[str] = []
    category: str = 'question'


class PostUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None


class CommentCreate(BaseModel):
    body: str
    parent_comment_id: Optional[str] = None
    intended_receiver_id: Optional[str] = None


class CommentUpdate(BaseModel):
    body: str


# ==================== POST ENDPOINTS ====================

@router.post("/posts")
async def create_post(
    post_data: PostCreate,
    user: User = Depends(get_current_user)
):
    """Create a new community post"""
    try:
        service = CommunityService()
        post = await service.create_post(
            user_id=user.user_id,
            title=post_data.title,
            content=post_data.body,
            course_id=post_data.course_id,
            tags=post_data.tags,
            category=post_data.category
        )
        return post
    except Exception as e:
        logger.error(f"Error creating post: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts")
async def get_posts(
    course_id: Optional[str] = None,
    limit: int = 20,
    offset: int = 0
):
    """Get community posts with optional filters"""
    try:
        service = CommunityService()
        posts = await service.get_posts(
            course_id=course_id,
            limit=limit,
            offset=offset
        )
        return posts
    except Exception as e:
        logger.error(f"Error fetching posts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts/{post_id}")
async def get_post(post_id: str):
    """Get a specific post by ID"""
    try:
        service = CommunityService()
        post = await service.get_post_by_id(post_id)
        
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        return post
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching post: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/posts/{post_id}")
async def update_post(
    post_id: str,
    update_data: PostUpdate,
    user: User = Depends(get_current_user)
):
    """Update a post"""
    try:
        service = CommunityService()
        post = await service.update_post(
            post_id=post_id,
            user_id=user.user_id,
            title=update_data.title,
            content=update_data.body,
            tags=update_data.tags,
            category=update_data.category
        )
        
        if not post:
            raise HTTPException(status_code=404, detail="Post not found or unauthorized")
        
        return post
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating post: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a post"""
    try:
        service = CommunityService()
        success = await service.delete_post(post_id, user.user_id)
        
        if success:
            return {"message": "Post deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Post not found or unauthorized")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting post: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== COMMENT ENDPOINTS ====================

@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: str,
    comment_data: CommentCreate,
    user: User = Depends(get_current_user)
):
    """Create a comment on a post"""
    try:
        service = CommunityService()
        comment = await service.create_comment(
            post_id=post_id,
            user_id=user.user_id,
            content=comment_data.body,
            parent_comment_id=comment_data.parent_comment_id,
            intended_receiver_id=comment_data.intended_receiver_id
        )
        return comment
    except Exception as e:
        logger.error(f"Error creating comment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts/{post_id}/comments")
async def get_comments(
    post_id: str,
    limit: int = 50
):
    """Get comments for a post"""
    try:
        service = CommunityService()
        comments = await service.get_comments(post_id, limit)
        return comments
    except Exception as e:
        logger.error(f"Error fetching comments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/comments/{comment_id}")
async def update_comment(
    comment_id: str,
    update_data: CommentUpdate,
    user: User = Depends(get_current_user)
):
    """Update a comment"""
    try:
        service = CommunityService()
        comment = await service.update_comment(
            comment_id=comment_id,
            user_id=user.user_id,
            content=update_data.body
        )
        
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found or unauthorized")
        
        return comment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating comment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a comment"""
    try:
        service = CommunityService()
        success = await service.delete_comment(comment_id, user.user_id)
        
        if success:
            return {"message": "Comment deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Comment not found or unauthorized")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting comment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== BOT REPLY ENDPOINT ====================

@router.post("/posts/{post_id}/bot-reply")
async def generate_bot_reply(
    post_id: str,
    parent_comment_id: str,
    user: User = Depends(get_current_user)
):
    """Manually trigger bot reply generation"""
    try:
        service = CommunityService()
        bot_reply = await service.generate_bot_reply(
            post_id=post_id,
            parent_comment_id=parent_comment_id
        )
        return bot_reply
    except Exception as e:
        logger.error(f"Error generating bot reply: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
