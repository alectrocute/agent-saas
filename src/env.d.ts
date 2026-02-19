/// <reference types="@cloudflare/workers-types" />
/// <reference types="./worker-configuration.d.ts" />

declare module "h3" {
  interface H3EventContext {
    userId?: string;
    cf: CfProperties;
    cloudflare: {
      request: Request;
      env: Env;
      context: ExecutionContext;
    };
  }
}

export {};
