"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Image, Loader2, X } from "lucide-react";
import { api, Shot } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props {
  shots: Shot[];
  onShotsChange: (shots: Shot[]) => void;
  onUpdateShot: (id: string, data: Partial<Shot>) => Promise<void>;
  onAddShot: () => void;
  onDeleteShot: (id: string) => void;
  onReorder: (shots: Shot[]) => void;
}

function SortableRow({
  row,
  onUpdate,
  onDelete,
}: {
  row: Shot;
  onUpdate: (id: string, data: Partial<Shot>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEdit = (field: string, currentValue: string) => {
    setEditingCell(`${row.id}-${field}`);
    setEditValue(currentValue);
  };

  const saveEdit = (field: string) => {
    const updates: Record<string, string | number | null> = {};
    const fieldMap: Record<string, string> = {
      shot_type: "shot_type",
      duration_sec: "duration_sec",
      content: "content",
      atmosphere: "atmosphere",
      ai_prompt: "ai_prompt",
      script_reference: "script_reference",
    };
    const modelField = fieldMap[field] || field;
    const currentVal = String((row as unknown as Record<string, unknown>)[modelField] ?? "");

    if (editValue !== currentVal) {
      const parsedValue = field === "duration_sec" ? (parseFloat(editValue) || null) : editValue;
      updates[modelField] = parsedValue;
      onUpdate(row.id, updates);
    }
    setEditingCell(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.uploadImage(file);
      await onUpdate(row.id, { reference_image_url: result.url });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    if (row.reference_image_url) {
      const filename = row.reference_image_url.split("/").pop();
      if (filename) {
        try {
          await api.deleteImage(filename);
        } catch {}
      }
    }
    await onUpdate(row.id, { reference_image_url: null });
  };

  const isLongText = (field: string) =>
    ["content", "ai_prompt", "atmosphere", "script_reference"].includes(field);

  const renderCell = (field: string, value: string | number | null, className = "") => {
    const cellKey = `${row.id}-${field}`;
    const display = value === null || value === undefined ? "-" : String(value);

    if (editingCell === cellKey) {
      if (isLongText(field)) {
        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 pt-20" onClick={() => saveEdit(field)}>
            <div className="w-full max-w-lg rounded-lg border bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <textarea
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => saveEdit(field)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveEdit(field);
                  if (e.key === "Escape") setEditingCell(null);
                }}
                rows={6}
                className="w-full rounded border border-input bg-background p-2 text-sm font-mono leading-relaxed outline-none focus:ring-2 focus:ring-ring resize-y"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{editValue.length} 字符</span>
                <span>Ctrl+Enter 保存 · Esc 取消</span>
              </div>
            </div>
          </div>
        );
      }
      return (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(field)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit(field);
            if (e.key === "Escape") setEditingCell(null);
          }}
          className="w-full rounded border border-primary bg-white px-1 py-0.5 text-xs outline-none"
        />
      );
    }
    return (
      <span
        className={`block min-h-[20px] cursor-pointer rounded px-1 py-0.5 text-xs hover:bg-muted ${className}`}
        onDoubleClick={() => startEdit(field, display)}
        title="双击编辑"
      >
        {display}
      </span>
    );
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b hover:bg-muted/30">
      <td className="w-8 px-1 py-2">
        <button
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-2 py-2 text-center text-xs">{row.shot_number}</td>
      <td className="px-2 py-2">{renderCell("shot_type", row.shot_type)}</td>
      <td className="px-2 py-2">{renderCell("duration_sec", row.duration_sec, "text-center")}</td>
      <td className="min-w-[160px] px-2 py-2">{renderCell("content", row.content)}</td>
      <td className="min-w-[120px] px-2 py-2">{renderCell("atmosphere", row.atmosphere)}</td>
      <td className="min-w-[120px] px-2 py-2">{renderCell("script_reference", row.script_reference)}</td>
      <td className="min-w-[160px] px-2 py-2">{renderCell("ai_prompt", row.ai_prompt)}</td>
      <td className="px-2 py-2">
        <div className="flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : row.reference_image_url ? (
            <div className="group relative">
              <img
                src={row.reference_image_url.startsWith("http") ? row.reference_image_url : `${API_BASE}${row.reference_image_url}`}
                alt="参考图"
                className="h-10 w-10 rounded object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute -right-1 -top-1 hidden rounded-full bg-destructive p-0.5 text-destructive-foreground group-hover:block"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="上传参考图"
              >
                <Image className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </>
          )}
        </div>
      </td>
      <td className="w-10 px-2 py-2">
        <button
          onClick={() => onDelete(row.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="删除"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

export default function StoryboardTable({
  shots,
  onUpdateShot,
  onAddShot,
  onDeleteShot,
  onReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const shotIds = useMemo(() => shots.map((s) => s.id), [shots]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = shots.findIndex((s) => s.id === active.id);
      const newIndex = shots.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newShots = [...shots];
      const [removed] = newShots.splice(oldIndex, 1);
      newShots.splice(newIndex, 0, removed);
      onReorder(newShots);
    },
    [shots, onReorder]
  );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 text-xs font-medium text-muted-foreground">
              <th className="w-8 px-1 py-2 text-left"><GripVertical className="h-3 w-3" /></th>
              <th className="w-10 px-2 py-2 text-center">镜号</th>
              <th className="w-16 px-2 py-2 text-left">景别</th>
              <th className="w-16 px-2 py-2 text-center">时长(s)</th>
              <th className="px-2 py-2 text-left">画面内容</th>
              <th className="px-2 py-2 text-left">场景氛围</th>
              <th className="px-2 py-2 text-left">对应脚本</th>
              <th className="px-2 py-2 text-left">AI生图提示词</th>
              <th className="w-16 px-2 py-2 text-center">参考图</th>
              <th className="w-10 px-2 py-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            <SortableContext items={shotIds} strategy={verticalListSortingStrategy}>
              {shots.map((shot) => (
                <SortableRow
                  key={shot.id}
                  row={shot}
                  onUpdate={onUpdateShot}
                  onDelete={onDeleteShot}
                />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </DndContext>
      <div className="border-t p-2">
        <button
          onClick={onAddShot}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          添加镜头
        </button>
      </div>
    </div>
  );
}
