import * as admin from "firebase-admin";

export interface AuditEntry {
  action: string;
  userId: string;
  userEmail: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  timestamp: admin.firestore.FieldValue;
}

export const logAuditEvent = async (
  action: string,
  userId: string,
  userEmail: string,
  resource: string,
  resourceId: string,
  details?: Record<string, unknown>
): Promise<void> => {
  const entry: AuditEntry = {
    action,
    userId,
    userEmail,
    resource,
    resourceId,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await admin.firestore().collection("auditLog").add(entry);
};
