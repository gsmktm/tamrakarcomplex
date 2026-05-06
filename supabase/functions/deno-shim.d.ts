// Ambient declarations to satisfy TypeScript when linting Supabase Edge Functions locally.
// These functions run on Deno in production; local tooling may lack Deno globals and remote module types.
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

declare module "https://esm.sh/@supabase/supabase-js@2.56.0" {
  export * from "@supabase/supabase-js";
}
