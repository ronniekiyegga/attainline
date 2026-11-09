import { z } from "zod";

const adapterCauseSchema = z.object({
  kind: z.string(),
  code: z.string().optional(),
  originalCode: z.string().optional(),
});

const databaseErrorSchema = z.object({
  name: z.string(),
  code: z.string().optional().catch(undefined),
  cause: adapterCauseSchema.optional().catch(undefined),
  meta: z.object({
    driverAdapterError: z.object({ cause: adapterCauseSchema }).optional(),
  }).optional().catch(undefined),
});

type DatabaseErrorDetails = {
  errorName: string;
  errorCode?: string;
  adapterKind?: string;
  sqlState?: string;
};

export function describeDatabaseError(error: unknown): DatabaseErrorDetails {
  const parsed = databaseErrorSchema.safeParse(error);

  if (!parsed.success) {
    return { errorName: "UnknownError" };
  }

  const cause = parsed.data.meta?.driverAdapterError?.cause ?? parsed.data.cause;

  return {
    errorName: parsed.data.name,
    errorCode: parsed.data.code,
    adapterKind: cause?.kind,
    sqlState: cause?.code ?? cause?.originalCode,
  };
}
