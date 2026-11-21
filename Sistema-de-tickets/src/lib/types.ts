import type { TicketCategory, TicketPriority, TicketStatus, UserRole } from "./constants";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface UserWithStats extends User {
  ticketsCreated: number;
  ticketsAssigned: number;
}

export interface Ticket {
  id: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  requesterId: number;
  assigneeId: number | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface TicketWithPeople extends Ticket {
  requesterName: string;
  requesterEmail: string;
  assigneeName: string | null;
  assigneeEmail: string | null;
  commentCount: number;
}

export interface Comment {
  id: number;
  ticketId: number;
  authorId: number;
  authorName: string;
  authorRole: UserRole;
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface Activity {
  id: number;
  ticketId: number;
  actorId: number | null;
  actorName: string | null;
  type: string;
  detail: string | null;
  createdAt: string;
}

export interface DashboardStats {
  open: number;
  inProgress: number;
  pending: number;
  unassigned: number;
  urgent: number;
  resolvedThisWeek: number;
  total: number;
  avgResolutionMs: number | null;
}

export interface StatusCount {
  status: TicketStatus;
  count: number;
}

export interface DayCount {
  day: string;
  count: number;
}
