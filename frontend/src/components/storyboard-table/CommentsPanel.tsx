"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Send, Trash2 } from "lucide-react";
import { api, Comment } from "@/lib/api";

interface Props {
  shotId: string | null;
  onClose: () => void;
}

export default function CommentsPanel({ shotId, onClose }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shotId) return;
    setLoading(true);
    api.listComments(shotId).then((res) => {
      setComments(res.items);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [shotId]);

  useEffect(() => {
    if (shotId) inputRef.current?.focus();
  }, [shotId]);

  const handleSend = async () => {
    if (!shotId || !text.trim()) return;
    setSending(true);
    try {
      const comment = await api.createComment(shotId, text.trim());
      setComments((prev) => [...prev, comment]);
      setText("");
    } catch {}
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    if (!shotId) return;
    try {
      await api.deleteComment(shotId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {}
  };

  if (!shotId) return null;

  return (
    <div className="fixed bottom-0 right-0 z-40 w-full max-w-sm border-l bg-white shadow-xl" style={{ top: "3.5rem" }}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-medium">镜头评论</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">暂无评论</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-muted/50 px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{c.user_name || c.user_id.slice(0, 8)}</span>
                  <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-sm">{c.content}</p>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  {c.created_at ? new Date(c.created_at).toLocaleString("zh-CN") : ""}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="border-t p-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入评论..."
              className="input-field flex-1 text-sm"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            />
            <button onClick={handleSend} disabled={sending || !text.trim()} className="btn-primary px-3">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
