import { useState, useEffect } from "react";
import type { PopulatedComment } from "@taskboard/shared";
import { fetchComments, updateComment, deleteComment } from "../api/comments";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { CommentForm } from "./comment-form";

interface CommentListProps {
  taskId: string;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString);
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (days < 30) return days === 1 ? "1 day ago" : `${days} days ago`;
  return date.toLocaleDateString();
}

export function CommentList({ taskId }: CommentListProps) {
  const [comments, setComments] = useState<PopulatedComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadComments = async () => {
      try {
        const response = await fetchComments(taskId);
        if (!cancelled) {
          setComments(response.data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load comments");
          setIsLoading(false);
        }
      }
    };

    loadComments();

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const handleEditClick = (comment: PopulatedComment) => {
    setEditingId(comment._id);
    setEditBody(comment.body);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    const trimmedBody = editBody.trim();
    if (!trimmedBody) return;

    try {
      const response = await updateComment(editingId, trimmedBody);

      setComments((prev) =>
        prev.map((comment) =>
          comment._id === editingId
            ? {
                ...comment,
                body: response.data.body,
                updatedAt: response.data.updatedAt,
              }
            : comment
        )
      );

      setEditingId(null);
      setEditBody("");
    } catch (err) {
      console.error("Failed to update comment:", err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditBody("");
  };

  const handleDeleteClick = (commentId: string) => {
    setDeleteId(commentId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteComment(deleteId);
      setComments((prev) => prev.filter((comment) => comment._id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error("Failed to delete comment:", err);
      setDeleteId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteId(null);
  };

  const handleCommentAdded = (newComment: PopulatedComment) => {
    setComments((prev) => [...prev, newComment]);
  };

  if (isLoading) {
    return <div className="mt-4 text-sm text-gray-500">Loading comments...</div>;
  }

  if (error) {
    return <div className="mt-4 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="mt-4">
      {comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment._id} className="border-b border-gray-100 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {comment.author.name}
                </span>
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </div>

              {editingId === comment._id ? (
                <div className="mt-2">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-sm text-gray-700">{comment.body}</p>
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => handleEditClick(comment)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(comment._id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <CommentForm taskId={taskId} onCommentAdded={handleCommentAdded} />
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        message="Are you sure you want to delete this comment?"
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
