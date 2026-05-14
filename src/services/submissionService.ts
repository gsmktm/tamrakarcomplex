import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { isValidEmail, isValidImei, isValidNepalPhone, normalizeEmail, normalizePhone, sanitizeOptionalText, sanitizeText } from "@/lib/security";

type ContactMessageInsert = TablesInsert<"contact_messages">;
type RepairRequestInsert = TablesInsert<"repair_requests">;
type LeadQuoteInsert = TablesInsert<"leads_quotes">;
type StoreApplicationInsert = TablesInsert<"store_applications">;

type AccountCreator = () => Promise<{ error: Error | null }>;

export type DeviceLeadPayload = {
  brand: string;
  model: string;
  storage: string;
  condition: string;
  defects: string[];
  imei: string;
};

export type LeadSubmissionInput = {
  type: LeadQuoteInsert["type"];
  quotedValue: number;
  condition: string;
  defects: string[];
  device: DeviceLeadPayload;
  customer: {
    name: string;
    email: string;
    phone: string;
    password?: string;
  };
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  createAccount?: AccountCreator;
  storeId?: string | null;
};

export type LeadSubmissionResult = {
  hasUserDashboard: boolean;
  usedFallback: boolean;
  requiresEmailConfirmation: boolean;
};

function isMissingTableError(error: { message?: string } | null, tableName: string) {
  const message = error?.message ?? "";
  return message.includes(tableName) || message.includes("schema cache");
}

function isMissingColumnError(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? "";
  const code = error?.code ?? "";
  return code === "42703" || message.toLowerCase().includes("does not exist") || message.toLowerCase().includes("column");
}

async function resolveCurrentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function submitContactMessage(values: ContactMessageInsert) {
  const email = normalizeEmail(String(values.email ?? ""));
  if (!isValidEmail(email)) throw new Error("Invalid email address");

  const { error } = await supabase.from("contact_messages").insert({
    ...values,
    name: sanitizeText(String(values.name ?? ""), 120),
    email,
    subject: sanitizeText(String(values.subject ?? ""), 180),
    message: sanitizeText(String(values.message ?? ""), 3000),
  });
  if (error) throw error;
}

export async function submitStoreApplication(values: StoreApplicationInsert) {
  const email = normalizeEmail(String(values.email ?? ""));
  if (!isValidEmail(email)) throw new Error("Invalid email address");

  const phone = normalizePhone(String(values.phone ?? ""));
  if (!isValidNepalPhone(phone)) throw new Error("Invalid Nepal mobile number");

  const sanitizedData = {
    ...values,
    owner_name: sanitizeText(String(values.owner_name ?? ""), 120),
    store_name: sanitizeText(String(values.store_name ?? ""), 120),
    email,
    phone,
    location: sanitizeText(String(values.location ?? ""), 200),
    shop_number: sanitizeOptionalText(String(values.shop_number ?? ""), 80),
    business_type: sanitizeOptionalText(String(values.business_type ?? ""), 120),
    message: sanitizeOptionalText(String(values.message ?? ""), 3000),
    status: "pending",
  };

  const { error, data } = await supabase.from("store_applications").insert(sanitizedData).select();
  if (error) throw error;

  return data?.[0];
}

export async function submitStoreApplicationWithFlow(values: any) {
  try {
    // Flow Step 1: Validate and sanitize inputs
    const email = normalizeEmail(String(values.email ?? ""));
    if (!isValidEmail(email)) throw new Error("Invalid email address");

    const phone = normalizePhone(String(values.phone ?? ""));
    if (!isValidNepalPhone(phone)) throw new Error("Invalid Nepal mobile number");

    const sanitizedData = {
      ...values,
      owner_name: sanitizeText(String(values.owner_name ?? ""), 120),
      store_name: sanitizeText(String(values.store_name ?? ""), 120),
      email,
      phone,
      location: sanitizeText(String(values.location ?? ""), 200),
      shop_number: sanitizeOptionalText(String(values.shop_number ?? ""), 80),
      business_type: sanitizeOptionalText(String(values.business_type ?? ""), 120),
      message: sanitizeOptionalText(String(values.message ?? ""), 3000),
      logo_url: sanitizeOptionalText(String(values.logo_url ?? ""), 500),
      license_url: sanitizeOptionalText(String(values.license_url ?? ""), 500),
      whatsapp: sanitizeOptionalText(String(values.whatsapp ?? ""), 32),
      viber: sanitizeOptionalText(String(values.viber ?? ""), 32),
      status: "pending" as const,
    };

    // Flow Step 2: Insert store application into database
    const { error: insertError, data: applicationData } = await supabase
      .from("store_applications")
      .insert(sanitizedData)
      .select()
      .single();

    if (insertError) {
      console.error("Database insertion failed:", insertError);
      throw new Error(`Failed to submit application: ${insertError.message}`);
    }

    if (!applicationData) throw new Error("Failed to create store application");

    const applicationId = applicationData.id;

    // Flow Step 3: Create audit log entry
    const currentUserId = await resolveCurrentUserId();
    const auditError = await createAuditLogForStoreApplication(
      applicationId,
      currentUserId,
      "store_application.submitted",
      sanitizedData
    );
    if (auditError) console.warn("Audit log creation failed:", auditError);

    // Flow Step 4: Notify admin via contact message
    await notifyAdminStoreApplicationSubmitted(applicationData);

    // Flow Step 5: Send confirmation to applicant
    await sendApplicationConfirmation(applicationData);

    return {
      success: true,
      applicationId,
      applicationData,
      message: "Store application submitted successfully and is pending review",
    };
  } catch (error) {
    console.error("Store application flow error:", error);
    throw error;
  }
}

/**
 * Completes the full stack onboarding for an approved store application.
 * IMPORTANT: Store is created with status="pending_approval" and public_status="draft"
 * Only after explicit admin approval via publishStore() does it become public.
 * 
 * Flow:
 * 1. Create store record (pending_approval, draft)
 * 2. Assign storeadmin role to user
 * 3. Update user profile
 * 4. Admin must call publishStore() to make it public_status="published"
 */
export async function completeFullStackStoreOnboarding(applicationData: any, userId: string) {
  try {
    // 1. Create the store record with pending_approval status (NOT active)
    const storeSlug = applicationData.store_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .insert({
        name: applicationData.store_name,
        slug: `${storeSlug}-${Math.floor(Math.random() * 1000)}`,
        owner_id: userId,
        phone: applicationData.phone,
        email: applicationData.email,
        location: applicationData.location,
        shop_no: applicationData.shop_number,
        logo_url: applicationData.logo_url,
        whatsapp: applicationData.whatsapp,
        viber: applicationData.viber,
        is_verified: false,
        status: "pending_approval",
        public_status: "draft",
      })
      .select()
      .single();

    if (storeError) {
      console.error("Store record creation failed:", storeError);
      throw new Error(`Onboarding failed at store creation: ${storeError.message}`);
    }

    // 2. Assign StoreAdmin role to the user
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "storeadmin",
      }, { onConflict: "user_id" });

    if (roleError) throw roleError;

    // 3. Update User Profile with Store Info
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "storeadmin",
        display_name: applicationData.owner_name,
      })
      .eq("id", userId);

    if (profileError) console.warn("Profile update failed during onboarding:", profileError);

    // 4. Create Audit Log for Onboarding
    await supabase.from("audit_logs").insert({
      actor_id: userId,
      actor_role: "suadmin", // System action
      action: "store.onboarded",
      module: "stores",
      target_id: storeData.id,
      new_data: storeData,
    });

    return { success: true, storeId: storeData.id };
  } catch (error) {
    console.error("Full stack onboarding error:", error);
    throw error;
  }
}

/**
 * Explicitly publish an approved store to make it visible publicly.
 * Should only be called by suadmin/staffadmin after reviewing the store.
 * 
 * Flow:
 * 1. Update store status from pending_approval → active
 * 2. Update public_status from draft → published
 * 3. Create audit log
 * 4. Create notification for store owner
 */
export async function publishStore(storeId: string, publishedBy: string) {
  try {
    // 1. Update store status and public_status
    const { data: storeData, error: updateError } = await supabase
      .from("stores")
      .update({
        status: "active",
        public_status: "published",
      })
      .eq("id", storeId)
      .select()
      .single();

    if (updateError) {
      console.error("Store publish failed:", updateError);
      throw new Error(`Failed to publish store: ${updateError.message}`);
    }

    if (!storeData) throw new Error("Store not found");

    // 2. Create audit log
    await supabase.from("audit_logs").insert({
      actor_id: publishedBy,
      actor_role: "suadmin",
      action: "store.published",
      module: "stores",
      target_id: storeId,
      new_data: { status: "active", public_status: "published" },
    });

    // 3. Notify store owner (via notification table if available)
    if (storeData.owner_id) {
      try {
        await supabase.from("notifications").insert({
          user_id: storeData.owner_id,
          role: "storeadmin",
          type: "store",
          title: "Store Published",
          message: `Your store "${storeData.name}" has been approved and published!`,
          link: `/storeadmin/dashboard`,
          metadata: { store_id: storeId }
        });
      } catch (err) {
        console.warn("Notification creation failed:", err);
      }
    }

    return { success: true, storeId };
  } catch (error) {
    console.error("Store publish error:", error);
    throw error;
  }
}

async function createAuditLogForStoreApplication(
  applicationId: string,
  userId: string | null,
  action: string,
  data: Record<string, unknown>
) {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      actor_id: userId,
      actor_role: "user",
      action,
      module: "stores",
      target_id: applicationId,
      new_data: data,
      old_data: null,
    });
    return error;
  } catch (err) {
    console.warn("Audit log creation error:", err);
    return err;
  }
}

async function notifyAdminStoreApplicationSubmitted(applicationData: Record<string, unknown>) {
  try {
    // Send notification to admin via contact message (fallback approach)
    await submitContactMessage({
      name: `Store Application: ${applicationData.store_name}`,
      email: String(applicationData.email ?? "store-app@tamrakarcomplex.com"),
      subject: `New Store Application - ${applicationData.store_name}`,
      message: JSON.stringify(
        {
          type: "store_application_notification",
          application_id: applicationData.id,
          store_name: applicationData.store_name,
          owner_name: applicationData.owner_name,
          phone: applicationData.phone,
          email: applicationData.email,
          location: applicationData.location,
          business_type: applicationData.business_type,
          status: "pending",
          submitted_at: new Date().toISOString(),
        },
        null,
        2
      ),
    });
  } catch (err) {
    console.warn("Admin notification failed:", err);
  }
}

async function sendApplicationConfirmation(applicationData: Record<string, unknown>) {
  try {
    // Send confirmation to applicant
    await submitContactMessage({
      name: String(applicationData.owner_name ?? "Applicant"),
      email: String(applicationData.email ?? ""),
      subject: "Store Application Received - Tamrakar Complex",
      message: `
Thank you for applying to Tamrakar Complex!

We have received your store application and will review it shortly.
Application ID: ${applicationData.id}
Store Name: ${applicationData.store_name}
Status: Pending Review

Our approval team will contact you at ${applicationData.phone} or ${applicationData.email} within 2-3 business days.

Best regards,
Tamrakar Complex Team
`,
    });
  } catch (err) {
    console.warn("Confirmation email failed:", err);
  }
}

async function submitExchangeRequest(input: LeadSubmissionInput, userId: string | null) {
  if (input.type !== "exchange") return;

  const oldDevice = {
    brand: sanitizeText(input.device.brand, 80),
    model: sanitizeText(input.device.model, 120),
    storage: sanitizeText(input.device.storage, 40),
    condition: sanitizeText(input.device.condition, 40),
    defects: input.device.defects.map((defect) => sanitizeText(defect, 80)),
    imei: sanitizeText(input.device.imei, 15),
  };

  const notes = JSON.stringify({
    customer_name: sanitizeText(input.customer.name, 120),
    customer_email: normalizeEmail(input.customer.email || input.currentUserEmail || ""),
    customer_phone: normalizePhone(input.customer.phone),
    store_id: input.storeId ?? null,
  });

  // Single canonical table: exchange_requests with nullable store_id
  // store_id = null: Official/platform exchange
  // store_id = <uuid>: Store-specific exchange
  const exchangeAttempt = await supabase.from("exchange_requests").insert({
    user_id: userId,
    store_id: input.storeId ?? null,
    customer_name: sanitizeText(input.customer.name, 120),
    customer_phone: normalizePhone(input.customer.phone),
    customer_email: normalizeEmail(input.customer.email || input.currentUserEmail || ""),
    old_device: oldDevice,
    new_device: {},
    trade_in_value: input.quotedValue,
    status: "pending",
    notes,
  } as any);

  if (exchangeAttempt.error && !isMissingTableError(exchangeAttempt.error, "exchange_requests") && !isMissingColumnError(exchangeAttempt.error)) {
    throw exchangeAttempt.error;
  }

  // Note: store_exchange_requests is deprecated. All exchanges now use exchange_requests table.
  // Store admins filter by: store_id IS NOT NULL AND store_id = their_store_id
}

export async function submitRepairRequest(values: RepairRequestInsert) {
  const phone = normalizePhone(String(values.phone ?? ""));
  if (!isValidNepalPhone(phone)) throw new Error("Invalid Nepal mobile number");
  const email = sanitizeOptionalText(String(values.email ?? ""), 320);
  if (email && !isValidEmail(email)) throw new Error("Invalid email address");
  const sanitizedValues = {
    ...values,
    name: sanitizeText(String(values.name ?? ""), 120),
    phone,
    email,
    device_brand: sanitizeText(String(values.device_brand ?? ""), 80),
    device_model: sanitizeText(String(values.device_model ?? ""), 120),
    issue_type: sanitizeText(String(values.issue_type ?? ""), 80),
    description: sanitizeOptionalText(String(values.description ?? ""), 3000),
  };

  // Attempt full insert first (new schema supports device_id/guide_id/tracking fields)
  const attempt1 = await supabase.from("repair_requests").insert({ ...sanitizedValues, status: sanitizedValues.status ?? "new" });
  if (!attempt1.error) return;

  // If the DB schema is behind (missing columns), retry with minimal legacy payload
  if (isMissingColumnError(attempt1.error)) {
    const legacyAllowed = [
      "user_id",
      "name",
      "phone",
      "email",
      "device_brand",
      "device_model",
      "issue_type",
      "description",
      "preferred_date",
      "status",
    ];

    const legacyPayload: Partial<RepairRequestInsert> = {};
    for (const key of legacyAllowed) {
      if (sanitizedValues[key as keyof RepairRequestInsert] !== undefined) {
        legacyPayload[key as keyof RepairRequestInsert] = sanitizedValues[key as keyof RepairRequestInsert];
      }
    }

    legacyPayload.status = legacyPayload.status ?? "new";
    const attempt2 = await supabase.from("repair_requests").insert(legacyPayload);
    if (!attempt2.error) return;
    throw attempt2.error;
  }

  throw attempt1.error;
}

export async function submitLeadQuote(input: LeadSubmissionInput): Promise<LeadSubmissionResult> {
  const email = normalizeEmail(input.customer.email || input.currentUserEmail || "");
  const phone = normalizePhone(input.customer.phone);
  if (email && !isValidEmail(email)) throw new Error("Invalid email address");
  if (!isValidNepalPhone(phone)) throw new Error("Invalid Nepal mobile number");
  if (input.device.imei && !isValidImei(input.device.imei)) throw new Error("Invalid IMEI");

  let userId = input.currentUserId ?? (await resolveCurrentUserId());
  let requiresEmailConfirmation = false;

  if (!userId && input.createAccount && input.customer.password) {
    const { error } = await input.createAccount();
    if (error) throw error;

    userId = await resolveCurrentUserId();
    requiresEmailConfirmation = !userId;
  }

  await submitExchangeRequest(input, userId);

  if (userId) {
    const payload: LeadQuoteInsert = {
      user_id: userId,
      type: input.type,
      device: {
        brand: sanitizeText(input.device.brand, 80),
        model: sanitizeText(input.device.model, 120),
        storage: sanitizeText(input.device.storage, 40),
        condition: sanitizeText(input.device.condition, 40),
        defects: input.device.defects.map((defect) => sanitizeText(defect, 80)),
        imei: sanitizeText(input.device.imei, 15),
      },
      condition: sanitizeText(input.condition, 40),
      defects: input.defects.map((defect) => sanitizeText(defect, 80)),
      quoted_value: input.quotedValue,
      status: "new",
    };

    // Use type casting to include store_id if supported by DB but not in static types
    const dbPayload = { ...payload } as any;
    if (input.storeId) {
      dbPayload.store_id = input.storeId;
      
      // Simulate Notification to Store Admin
      console.log(`Notification sent to Store ID: ${input.storeId} for new ${input.type} lead`);
      
      // Future: Add real notification insert here
      // await supabase.from('notifications').insert({ ... })
    }

    const { error } = await supabase.from("leads_quotes").insert(dbPayload);
    if (!error) {
      return {
        hasUserDashboard: true,
        usedFallback: false,
        requiresEmailConfirmation,
      };
    }

    if (!isMissingTableError(error, "leads_quotes")) {
      throw error;
    }
  }

  const fallbackSubject = input.type === "exchange" ? "Exchange Lead (fallback)" : "Sell Lead - Cash (fallback)";
  const fallbackNote = userId
    ? "Fallback lead: leads_quotes table unavailable"
    : "Fallback lead: account confirmation required";

  await submitContactMessage({
    name: input.customer.name,
    email: email || "no-reply@tamrakarcomplex.com",
    subject: fallbackSubject,
    message: JSON.stringify({
      name: sanitizeText(input.customer.name, 120),
      email,
      phone,
      device: input.device,
      quoted_value: input.quotedValue,
      type: input.type,
      note: fallbackNote,
    }),
  });

  return {
    hasUserDashboard: false,
    usedFallback: true,
    requiresEmailConfirmation,
  };
}
