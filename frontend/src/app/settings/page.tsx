"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Save, Key, User } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);

  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadUser().catch(() => {});
  }, [token, router, loadUser]);

  useEffect(() => {
    if (user) setName(user.name || "");
  }, [user]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.updateSettings({
        name: name || undefined,
        deepseek_key: apiKey || undefined,
      });
      await loadUser();
      setSuccess(true);
      setApiKey("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="page-title mb-8">设置</h1>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card-panel p-6 space-y-5">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-medium">个人信息</h2>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div>
            <label className="section-label">显示名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="您的名称"
            />
          </div>
        </div>

        <div className="card-panel p-6 space-y-5">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-medium">DeepSeek API</h2>
              <p className="text-xs text-muted-foreground">配置 API Key 以启用 AI 拆解功能</p>
            </div>
          </div>
          <div>
            <label className="section-label">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-field"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              留空则保持现有 Key 不变。Key 会加密存储。
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">
            设置保存成功
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存设置
            </>
          )}
        </button>
      </form>
    </div>
  );
}
