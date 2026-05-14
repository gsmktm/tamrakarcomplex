/**
 * Global error handler for Supabase operations in Super Admin panel
 * Handles connection issues, permission errors, and missing tables/functions
 */

import { toast } from "sonner";

export type SupabaseErrorType = 
  | "connection_error"
  | "permission_error"
  | "not_found_error"
  | "schema_cache_error"
  | "rls_error"
  | "unknown_error";

export function getSupabaseErrorType(error: any): SupabaseErrorType {
  if (!error) return "unknown_error";

  const message = error.message?.toLowerCase() || "";
  const code = error.code?.toLowerCase() || "";
  const status = error.status;

  // Connection errors
  if (message.includes("internet disconnected") || message.includes("failed") || status === 0) {
    return "connection_error";
  }

  // Schema cache errors (RPC/function not found)
  if (code === "pgrst202" || message.includes("schema cache") || message.includes("could not find the function")) {
    return "schema_cache_error";
  }

  // Permission/RLS errors
  if (code === "42501" || status === 403 || message.includes("permission denied") || message.includes("rls")) {
    return "rls_error";
  }

  // Not found errors
  if (status === 404 || code === "pgrst116" || message.includes("not found")) {
    return "not_found_error";
  }

  // JWT/Auth errors
  if (status === 401 || message.includes("jwt")) {
    return "permission_error";
  }

  return "unknown_error";
}

export function getSupabaseErrorMessage(error: any): string {
  const type = getSupabaseErrorType(error);

  switch (type) {
    case "connection_error":
      return "Database connection failed. Please check your internet connection and try again.";
    case "schema_cache_error":
      return "Database function not found. Please contact support or redeploy migrations.";
    case "rls_error":
      return "Permission denied. You don't have access to perform this action.";
    case "not_found_error":
      return "Resource not found in database.";
    case "permission_error":
      return "Authentication failed. Please log in again.";
    default:
      return error?.message || "An unexpected error occurred";
  }
}

export function handleSupabaseError(error: any, context: string = "Operation", showToast = true) {
  console.error(`${context} error:`, error);
  
  const message = getSupabaseErrorMessage(error);
  
  if (showToast) {
    toast.error(message);
  }
  
  return { errorType: getSupabaseErrorType(error), message };
}

export function isConnectionError(error: any): boolean {
  return getSupabaseErrorType(error) === "connection_error";
}

export function isSchemaCacheError(error: any): boolean {
  return getSupabaseErrorType(error) === "schema_cache_error";
}

export function isRlsError(error: any): boolean {
  return getSupabaseErrorType(error) === "rls_error";
}
