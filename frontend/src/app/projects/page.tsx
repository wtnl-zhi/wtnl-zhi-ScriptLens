"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { api, Project } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const STATUS_TABS = [
  { key: "", label: "全部" },
  { key: "draft", label: "草稿" },
  { key: "in_progress", label: "进行中" },
  { key: "completed", label: "已完成" },
];

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  in_progress: "进行中",
  completed: "已完成",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export default function ProjectsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    api
      .listProjects()
      .then((res) => setProjects(res.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, router]);

  const filtered = filter
    ? projects.filter((p) => p.status === filter)
    : projects;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-muted-foreground">加载中...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">项目列表</h1>
        <Link
          href="/projects/new"
          className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新建项目
        </Link>
      </div>

      <div className="mb-6 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              filter === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <FileText className="mb-2 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">暂无项目</p>
          <Link
            href="/projects/new"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            新建项目
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="mb-2 font-medium group-hover:text-primary transition-colors">
                {project.title}
              </h3>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                  STATUS_COLORS[project.status] || "bg-gray-100 text-gray-800"
                }`}
              >
                {STATUS_LABELS[project.status] || project.status}
              </span>
              <div className="mt-3 text-xs text-muted-foreground">
                <p>创建: {new Date(project.created_at).toLocaleDateString("zh-CN")}</p>
                <p>
                  更新: {new Date(project.updated_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
