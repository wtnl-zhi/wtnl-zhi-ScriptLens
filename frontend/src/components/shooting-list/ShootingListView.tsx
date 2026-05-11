"use client";

import { useState, useMemo } from "react";
import { Loader2, Sparkles, FileText, Download } from "lucide-react";
import { Shot, api } from "@/lib/api";

interface Props {
  shots: Shot[];
  projectId: string;
  onUpdateShot: (id: string, data: Partial<Shot>) => Promise<void>;
}

export default function ShootingListView({ shots, projectId, onUpdateShot }: Props) {
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [editingShot, setEditingShot] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Shot[]> = {};
    for (const s of shots) {
      const key = s.scene_name || "未分组";
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [shots]);

  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      const { task_id } = await api.generateShootingSummary(projectId);
      while (true) {
        await new Promise((r) => setTimeout(r, 1500));
        const status = await api.getTaskStatus(task_id);
        if (status.status === "completed") {
          const res = await api.getShootingSummary(projectId);
          setSummary(res.summary);
          break;
        }
        if (status.status === "failed") {
          throw new Error(status.error || "生成失败");
        }
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleOptimize = async (field: "content" | "ai_prompt") => {
    setOptimizing(true);
    try {
      const { task_id } = await api.batchOptimize(projectId, field);
      while (true) {
        await new Promise((r) => setTimeout(r, 1500));
        const status = await api.getTaskStatus(task_id);
        if (status.status === "completed") {
          break;
        }
        if (status.status === "failed") {
          throw new Error(status.error || "优化失败");
        }
      }
      window.location.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "优化失败");
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async (shotId: string, field: string, value: string) => {
    await onUpdateShot(shotId, { [field]: value || null });
    setEditingShot(null);
  };

  const totalDuration = shots.reduce((sum, s) => sum + (s.duration_sec || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleGenerateSummary} disabled={generating} className="btn-primary gap-1.5 text-xs">
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {generating ? "生成中..." : "AI 拍摄总结"}
        </button>
        <button onClick={() => handleOptimize("content")} disabled={optimizing || shots.length === 0} className="btn-secondary gap-1">
          {optimizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          优化画面内容
        </button>
        <button onClick={() => handleOptimize("ai_prompt")} disabled={optimizing || shots.length === 0} className="btn-secondary gap-1">
          优化 AI 提示词
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="card-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">拍摄统筹清单</h3>
            <button onClick={() => setSummary(null)} className="text-xs text-muted-foreground hover:text-foreground">收起</button>
          </div>
          <div className="prose prose-sm max-w-none">
            {summary.split("\n").map((line, i) => (
              line.startsWith("#") ? (
                <h4 key={i} className="text-sm font-bold mt-4 mb-2">{line.replace(/^#+\s*/, "")}</h4>
              ) : line.trim() ? (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">{line}</p>
              ) : <br key={i} />
            ))}
          </div>
        </div>
      )}

      {/* By Scene Groups */}
      {Object.entries(grouped).map(([scene, sceneShots]) => (
        <div key={scene} className="card-panel overflow-hidden">
          <div className="border-b bg-muted/20 px-4 py-2.5 flex items-center justify-between">
            <h3 className="text-sm font-medium">{scene}</h3>
            <span className="text-xs text-muted-foreground">{sceneShots.length} 个镜头</span>
          </div>
          <div className="divide-y">
            {sceneShots.map((shot) => (
              <div key={shot.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">#{shot.shot_number}</span>
                  <span className="text-xs text-muted-foreground">{shot.shot_type} · {shot.duration_sec}s</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {(["characters", "location", "props", "scene_name"] as const).map((field) => {
                    const val = shot[field];
                    if (val === null || val === undefined || val === "") return null;
                    return (
                      <div key={field} className="text-xs">
                        <span className="text-muted-foreground">{({characters:"角色", location:"地点", props:"道具", scene_name:"场景"})[field]}: </span>
                        {editingShot === `${shot.id}-${field}` ? (
                          <input
                            autoFocus
                            defaultValue={val as string}
                            className="input-field text-xs py-0.5 px-1 w-32"
                            onBlur={(e) => handleSave(shot.id, field, e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSave(shot.id, field, (e.target as HTMLInputElement).value)}
                          />
                        ) : (
                          <span className="cursor-pointer hover:bg-muted rounded px-0.5" onClick={() => setEditingShot(`${shot.id}-${field}`)}>{val as string}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{shot.content}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {shots.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FileText className="mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm">暂无镜头数据</p>
        </div>
      )}
    </div>
  );
}
