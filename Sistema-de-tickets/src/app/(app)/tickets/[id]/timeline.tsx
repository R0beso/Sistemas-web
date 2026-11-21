import {
  Activity as ActivityIcon,
  Flag,
  Lock,
  Plus,
  RefreshCw,
  Tag,
  UserPlus,
} from "lucide-react";
import type { ComponentType } from "react";
import { Avatar, RoleBadge } from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/format";
import type { Activity, Comment } from "@/lib/types";

const ACTIVITY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  CREATED: Plus,
  ASSIGNED: UserPlus,
  STATUS: RefreshCw,
  PRIORITY: Flag,
  CATEGORY: Tag,
};

type TimelineEvent =
  | { kind: "comment"; at: string; comment: Comment }
  | { kind: "activity"; at: string; activity: Activity };

export function Timeline({
  comments,
  activities,
}: {
  comments: Comment[];
  activities: Activity[];
}) {
  const events: TimelineEvent[] = [
    ...comments.map((comment) => ({ kind: "comment" as const, at: comment.createdAt, comment })),
    ...activities
      .filter((activity) => activity.type !== "COMMENT" && activity.type !== "NOTE")
      .map((activity) => ({ kind: "activity" as const, at: activity.createdAt, activity })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-xs text-slate-400">
        Todavía no hay actividad en este ticket.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => {
        if (event.kind === "activity") {
          const { activity } = event;
          const Icon = ACTIVITY_ICONS[activity.type] ?? ActivityIcon;
          return (
            <li key={`activity-${activity.id}`}>
              <div className="flex items-center gap-2.5 rounded-xl bg-slate-100/70 px-3 py-2 text-[11px] text-slate-500">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                  <Icon className="h-3 w-3" />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {activity.actorName ? (
                    <span className="font-semibold text-slate-700">{activity.actorName} </span>
                  ) : null}
                  {activity.detail ?? "Actualizó el ticket"}
                </span>
                <span
                  className="shrink-0 text-slate-400"
                  title={formatDateTime(activity.createdAt)}
                >
                  {relativeTime(activity.createdAt)}
                </span>
              </div>
            </li>
          );
        }

        const { comment } = event;
        return (
          <li key={`comment-${comment.id}`}>
            <article
              className={`rounded-2xl border p-4 shadow-sm ${
                comment.internal
                  ? "border-amber-200 bg-amber-50/60"
                  : "border-slate-200/80 bg-white"
              }`}
            >
              <header className="flex items-start gap-2.5">
                <Avatar name={comment.authorName} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800">
                      {comment.authorName}
                    </span>
                    <RoleBadge role={comment.authorRole} />
                    {comment.internal ? (
                      <span className="chip bg-amber-100 text-amber-700 ring-amber-200">
                        <Lock className="h-2.5 w-2.5" /> Nota interna
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {formatDateTime(comment.createdAt)} · {relativeTime(comment.createdAt)}
                  </p>
                </div>
              </header>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {comment.body}
              </p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
