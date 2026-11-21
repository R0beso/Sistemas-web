"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { updateUserRoleAction } from "@/actions/users";
import { Toast } from "@/components/toast";
import { ROLE_META, USER_ROLES, type UserRole } from "@/lib/constants";

export function UserRoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: number;
  role: UserRole;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<UserRole>(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(role);
  }, [role]);

  function change(next: UserRole) {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await updateUserRoleAction({ userId, role: next });
      if (!result.ok) {
        setValue(previous);
        setError(result.error ?? "No se pudo cambiar el rol.");
      }
    });
  }

  return (
    <>
      <div className="relative inline-flex items-center">
        <select
          value={value}
          disabled={pending || disabled}
          onChange={(event) => change(event.target.value as UserRole)}
          aria-label="Rol del usuario"
          className="select w-auto min-w-[136px] py-1.5 pl-2.5 pr-8 text-xs font-medium"
        >
          {USER_ROLES.map((option) => (
            <option key={option} value={option}>
              {ROLE_META[option].label}
            </option>
          ))}
        </select>
        {pending ? (
          <Loader2 className="pointer-events-none absolute right-2.5 h-3 w-3 animate-spin text-indigo-500" />
        ) : null}
      </div>
      {error ? <Toast message={error} onClose={() => setError(null)} /> : null}
    </>
  );
}
