"use client";

import { useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Settings, Loader2, Sparkles } from "lucide-react";
import StoryboardTable from "@/components/storyboard-table/StoryboardTable";
import { api, Shot } from "@/lib/api";
import { useProjectStore } from "@/store/projectStore";

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const {
    currentProject,
    shots,
    loading,
    loadProject,
    setShots,
    updateShot,
    addShot,
    deleteShot,
    reorderShots,
  } = useProjectStore();

  useEffect(() => {
    loadProject(projectId).catch(() => router.push("/projects"));
  }, [projectId, loadProject, router]);

  const handleUpdateShot = useCallback(
    async (id: string, data: Partial<Shot>) => {
      await updateShot(id, data);
    },
    [updateShot]
  );

  const handleAddShot = useCallback(async () => {
    await addShot();
  }, [addShot]);

  const handleDeleteShot = useCallback(
    async (id: string) => {
      await deleteShot(id);
    },
    [deleteShot]
  );

  const handleReorder = useCallback(
    async (items: Shot[]) => {
      await reorderShots(items);
    },
    [reorderShots]
  );

  const handleGenerate = async () => {
    if (!currentProject?.source_text) return;
    try {
      await api.generateStoryboard(projectId);
      await loadProject(projectId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "拆解失败");
    }
  };

  const handleExport = (type: "excel" | "csv" | "pdf") => {
    const urls: Record<string, string> = {
      excel: api.getExcelUrl(projectId),
      csv: api.getCsvUrl(projectId),
      pdf: api.getPdfUrl(projectId),
    };
    window.open(urls[type], "_blank");
  };

  if (loading && !currentProject) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentProject) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{currentProject.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {currentProject.source_text && shots.length === 0 && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              开始拆解
            </button>
          )}
          <button
            onClick={() => handleExport("excel")}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Download className="h-3 w-3" />
            Excel
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Download className="h-3 w-3" />
            PDF
          </button>
          <Link
            href={`/projects/${projectId}/settings`}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Settings className="h-3 w-3" />
            设置
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-1/3">
          <div className="rounded-lg border bg-muted/20 p-4">
            <h2 className="mb-3 text-sm font-medium">原始脚本</h2>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground font-mono">
              {currentProject.source_text || "无脚本内容"}
            </pre>
          </div>
        </div>
        <div className="w-full lg:w-2/3">
          <StoryboardTable
            shots={shots}
            onShotsChange={setShots}
            onUpdateShot={handleUpdateShot}
            onAddShot={handleAddShot}
            onDeleteShot={handleDeleteShot}
            onReorder={handleReorder}
          />
        </div>
      </div>
    </div>
  );
}
