export type Signature = { id: string; status: string; signed_at: string | null; signed_pdf_path: string | null; signed_pdf_hash: string | null; email_verified_at: string | null };
export type Signatory = {
  id: string; organization_name: string; organization_type: string; representative_name: string;
  representative_role: string; email: string; phone: string | null; address: string | null; website: string | null;
  status: string; created_at: string; published_at: string | null; signatures: Signature[];
};
export type DocumentItem = { id: string; title: string; version: string; original_file_path: string; sha256_hash: string; is_active: boolean; created_at: string };
export type AuditItem = { id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string; metadata: Record<string, unknown> };
export type AdminItem = { user_id: string; role: string; created_at: string; email: string };
export type Paged<T> = { items: T[]; count: number; page: number };
export function canPublish(item: Signatory) {
  return item.status === "signed" && item.signatures.some(sig =>
    sig.status === "signed" && sig.email_verified_at && sig.signed_at && sig.signed_pdf_path && sig.signed_pdf_hash);
}
