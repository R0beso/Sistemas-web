"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { USER_ROLES, type UserRole } from "@/lib/constants";
import type { User } from "@/lib/types";
import {
  countActiveAdmins,
  createUser,
  findUserById,
  resetUserPassword,
  setUserActive,
  updateUserRole,
} from "@/lib/users";

const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(80, "El nombre es demasiado largo."),
  email: z
    .string()
    .trim()
    .min(5, "Introduce un correo electrónico.")
    .max(160, "El correo es demasiado largo.")
    .email("Introduce un correo electrónico válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(72, "La contraseña es demasiado larga."),
  role: z.enum(USER_ROLES),
});

async function getAdminUser(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function createUserAction(
  _previousState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const admin = await getAdminUser();
  if (!admin) {
    const current = await getCurrentUser();
    if (!current) redirect("/login");
    return { error: "Solo un administrador puede realizar esta acción." };
  }

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const result = createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
    role: parsed.data.role as UserRole,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/users");
  revalidatePath("/");
  redirect("/users");
}

export async function updateUserRoleAction(input: {
  userId: number;
  role: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "No tienes permisos." };

  if (!(USER_ROLES as readonly string[]).includes(input.role)) {
    return { ok: false, error: "Rol no válido." };
  }

  const target = findUserById(input.userId);
  if (!target) return { ok: false, error: "El usuario no existe." };

  if (target.role === "ADMIN" && input.role !== "ADMIN" && countActiveAdmins(target.id) === 0) {
    return { ok: false, error: "Debe existir al menos un administrador activo." };
  }

  updateUserRole(target.id, input.role as UserRole);
  revalidatePath("/users");
  return { ok: true };
}

export async function toggleUserActiveAction(input: {
  userId: number;
  active: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "No tienes permisos." };

  const target = findUserById(input.userId);
  if (!target) return { ok: false, error: "El usuario no existe." };

  if (target.id === admin.id && !input.active) {
    return { ok: false, error: "No puedes desactivar tu propia cuenta." };
  }

  if (!input.active && target.role === "ADMIN" && countActiveAdmins(target.id) === 0) {
    return { ok: false, error: "Debe existir al menos un administrador activo." };
  }

  setUserActive(target.id, input.active);
  revalidatePath("/users");
  return { ok: true };
}

export async function resetPasswordAction(input: {
  userId: number;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "No tienes permisos." };

  if (input.password.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (input.password.length > 72) {
    return { ok: false, error: "La contraseña es demasiado larga." };
  }

  const target = findUserById(input.userId);
  if (!target) return { ok: false, error: "El usuario no existe." };

  resetUserPassword(target.id, input.password);
  revalidatePath("/users");
  return { ok: true };
}
