import { invoke } from "@tauri-apps/api/core";

export type SessionRow = {
  id: number;
  user_id: number;
  login_at: string;
  logout_at: string | null;
  garments_scanned: number;
  tickets_completed: number;
};

export async function startUserSessionTauri(userId: number): Promise<SessionRow> {
  return invoke<SessionRow>("start_user_session", { userIdInput: userId });
}

export async function endUserSessionTauri(sessionId: number): Promise<SessionRow> {
  return invoke<SessionRow>("end_user_session", { sessionId });
}

export async function incrementSessionGarmentsTauri(sessionId: number): Promise<SessionRow> {
  console.log("Incrementing garments for session ID:", sessionId);
  return invoke<SessionRow>("increment_session_garments", { sessionId });
}

export async function incrementSessionTicketsTauri(sessionId: number): Promise<SessionRow> {
  return invoke<SessionRow>("increment_session_tickets", { sessionId });
}

export async function sessionExistsTodayTauri(userId: number): Promise<boolean> {
  return invoke<boolean>("session_exists_today_tauri", { userIdInput: userId });
}

export async function getExistingSession(userId: number): Promise<SessionRow> {
  return invoke<SessionRow>("get_existing_session", { userIdInput: userId });
}
