import { useState } from "react";
import type { PopulatedComment } from "@taskboard/shared";
import { createComment } from "../api/comments";
import { useAuth } from "../context/auth-context";

interface CommentFormProps {
  taskId: string;
  onCommentAdded: (comment: PopulatedComment) => void;
}

export function CommentForm({ taskId, onCommentAdded }: CommentFormProps) {
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleSubmit = async () => {
    const trimmedBody = body.trim();
    if (!trimmedBody) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createComment(taskId, trimmedBody);

      const populatedComment: PopulatedComment = {
        ...response.data,
        author: { _id: user!.id, name: user!.name, email: user!.email },
      };

      onCommentAdded(populatedComment);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment..."
        rows={3}
        disabled={isSubmitting}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      <div className="mt-2 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !body.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Commenting..." : "Comment"}
        </button>
      </div>
    </div>
  );
}
