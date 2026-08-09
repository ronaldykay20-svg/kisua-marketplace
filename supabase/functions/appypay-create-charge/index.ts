// Edge Function: appypay-create-charge
// Cria a cobrança EMIS/AppyPay para um pedido já existente:
//   • method "ref" → gera Referência Multicaixa (entidade + referência)
//   • method "gpo" → envia pedido de pagamento para o Multicaixa Express
//
// O montante NUNCA vem do browser — é lido do total do pedido na base de dados.
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createCharge, newMerchantTransactionId } from "../_shared/appypay.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── Autenticação: validamos o JWT do comprador em código ──
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Sessão inválida. Faça login novamente." }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Sessão inválida. Faça login novamente." }, 401);
    }
    const user = userData.user;

    // ── Validação do corpo do pedido ──
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Corpo do pedido inválido" }, 400);
    }
    const orderId = typeof body?.order_id === "string" ? body.order_id.trim() : "";
    const method = body?.method === "gpo" ? "gpo" : body?.method === "ref" ? "ref" : null;
    const phone = typeof body?.phone_number === "string" ? body.phone_number.replace(/\D/g, "") : "";

    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "order_id inválido" }, 400);
    if (!method) return json({ error: "Método de pagamento inválido" }, 400);
    if (method === "gpo" && !/^9\d{8}$/.test(phone)) {
      return json({ error: "Número Multicaixa Express inválido (9 dígitos, começa por 9)" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, user_id, total, order_number, payment_method")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr) {
      console.error("Erro ao ler pedido:", orderErr);
      return json({ error: "Não foi possível ler o pedido" }, 500);
    }
    if (!order) return json({ error: "Pedido não encontrado" }, 404);
    if (order.user_id !== user.id) return json({ error: "Este pedido não é seu" }, 403);

    const amount = Number(order.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "Total do pedido inválido" }, 400);
    }

    const merchantTransactionId = newMerchantTransactionId();
    const shortId = String(order.order_number ?? order.id).slice(0, 12);

    const charge = await createCharge({
      amount,
      method,
      merchantTransactionId,
      description: `Zangu pedido ${shortId}`,
      phoneNumber: method === "gpo" ? phone : null,
    });

    await admin.from("appypay_charges").insert({
      order_id: order.id,
      user_id: user.id,
      merchant_transaction_id: merchantTransactionId,
      method,
      amount,
      charge_id: charge.chargeId,
      reference_number: charge.referenceNumber,
      entity: charge.entity,
      due_date: charge.dueDate,
      status: charge.successful ? "pending" : "failed",
      raw_response: charge.raw,
    });

    if (charge.referenceNumber || charge.entity) {
      await admin
        .from("orders")
        .update({
          payment_reference: charge.referenceNumber,
          payment_entity: charge.entity,
          payment_reference_due: charge.dueDate,
        })
        .eq("id", order.id);
    }

    return json({
      charge_id: charge.chargeId,
      merchant_transaction_id: merchantTransactionId,
      status: charge.status,
      message: charge.message,
      reference_number: charge.referenceNumber,
      entity_number: charge.entity,
      due_date: charge.dueDate,
      amount,
    });
  } catch (e: any) {
    console.error("appypay-create-charge:", e);
    return json({ error: e?.message ?? "Erro inesperado no pagamento" }, 500);
  }
});
