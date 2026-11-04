export interface SentEmail {
  id: string;
  to_email: string;
  subject: string;
  send_method: string | null;
  sent_at: string;
}
