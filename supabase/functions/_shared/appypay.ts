// Utilitários partilhados da integração EMIS / AppyPay (e-kwanza · pay4all).
//
// Fluxo (doc "Pagamento Integrado v2.7", secção GPO/REF):
//   1. Autenticação OAuth2 client_credentials no Azure AD da AppyPay
//   2. POST /v2.0/charges com o paymentMethod do comerciante
//   3. A AppyPay avisa o pagamento no webhook appypay-webhook
//
// deno-lint-ignore-file no-explicit-any

export const APPYPAY_TOKEN_URL =
  Deno.env.get("APPYPAY_TOKEN_URL") ??
  "https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token";

export const APPYPAY_BASE_URL =
  Deno.env.get("APPYPAY_BASE_URL") ?? "https://gwy-api.appypay.co.ao";

/** Obtém o Bearer token do gateway. */
export async function getAppyPayToken(): Promise<string> {
  const clientId = Deno.env.get("APPYPAY_CLIENT_ID");
  const clientSecret = Deno.env.get("APPYPAY_CLIENT_SECRET");
  const resource = Deno.env.get("APPYPAY_RESOURCE");
  if (!clientId || !clientSecret || !resource) {
    throw new Error("Credenciais AppyPay não configuradas no servidor");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    resource,
  });

  const res = await fetch(APPYPAY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`AppyPay auth falhou [${res.status}]: ${text}`);
    throw new Error("Falha na autenticação com o gateway de pagamentos");
  }
  const json = JSON.parse(text);
  if (!json?.access_token) throw new Error("Gateway não devolveu token");
  return json.access_token as string;
}

/**
 * O gateway exige o paymentMethod no formato "GPO_<uuid>" / "REF_<uuid>".
 * Nos segredos guardamos só o uuid, por isso prefixamos aqui (a menos que o
 * valor já venha com o prefixo).
 */
export function paymentMethodFor(method: "gpo" | "ref"): string {
  const prefix = method === "gpo" ? "GPO" : "REF";
  const id =
    method === "gpo"
      ? Deno.env.get("APPYPAY_PAYMENT_METHOD_GPO")
      : Deno.env.get("APPYPAY_PAYMENT_METHOD_REF");
  if (!id) throw new Error(`paymentMethod ${prefix} não configurado no servidor`);
  return id.includes("_") ? id : `${prefix}_${id}`;
}

/**
 * merchantTransactionId: máximo 15 caracteres alfanuméricos (regra do gateway,
 * erro 719). Usamos "ZG" + timestamp base36 + 3 aleatórios.
 */
export function newMerchantTransactionId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ZG${ts}${rnd}`.slice(0, 15);
}

export type ChargeResult = {
  chargeId: string | null;
  successful: boolean;
  code: number | null;
  message: string | null;
  status: string | null;
  referenceNumber: string | null;
  entity: string | null;
  dueDate: string | null;
  gpo: any;
  raw: any;
};

/** Cria a cobrança no gateway (Referência EMIS ou Multicaixa Express). */
export async function createCharge(params: {
  amount: number;
  method: "gpo" | "ref";
  merchantTransactionId: string;
  description: string;
  phoneNumber?: string | null;
}): Promise<ChargeResult> {
  const token = await getAppyPayToken();
  const merchantIdentifier = Deno.env.get("APPYPAY_MERCHANT_IDENTIFIER");
  const apiKey = Deno.env.get("APPYPAY_API_KEY");

  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: "AOA",
    description: params.description.slice(0, 100),
    merchantTransactionId: params.merchantTransactionId,
    paymentMethod: paymentMethodFor(params.method),
    options: {
      ...(merchantIdentifier ? { MerchantIdentifier: merchantIdentifier } : {}),
      ...(apiKey ? { ApiKey: apiKey } : {}),
    },
  };
  if (params.method === "gpo") {
    body.paymentInfo = { phoneNumber: params.phoneNumber };
  }

  const res = await fetch(`${APPYPAY_BASE_URL}/v2.0/charges`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch { /* resposta não-JSON */ }

  if (!res.ok) {
    console.error(`AppyPay charges falhou [${res.status}]: ${text}`);
    const msg =
      json?.responseStatus?.message ||
      json?.error_description ||
      "O gateway recusou o pagamento. Tente novamente.";
    throw new Error(msg);
  }

  const rs = json?.responseStatus ?? {};
  return {
    chargeId: json?.id ?? null,
    successful: rs.successful === true,
    code: rs.code ?? null,
    message: rs.message ?? null,
    status: rs.status ?? null,
    referenceNumber: rs.reference?.referenceNumber ?? null,
    entity: rs.reference?.entity ?? null,
    dueDate: rs.reference?.dueDate ?? null,
    gpo: rs.gpo ?? null,
    raw: json,
  };
}
