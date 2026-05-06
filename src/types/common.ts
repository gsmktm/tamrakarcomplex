export type ID = string;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type UserRole =
  | "suadmin"
  | "staffadmin"
  | "storeadmin"
  | "storestaff"
  | "user";

export type Status =
  | "active"
  | "inactive"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "completed"
  | "cancelled";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "export"
  | "publish";
