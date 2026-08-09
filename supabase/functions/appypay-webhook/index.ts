// Edge Function: appypay-webhook
// Webhook chamado pela AppyPay/e-kwanza quando um pagamento por Referência ou
// Multicaixa Express (GPO) é concluído (doc v2.7, "Callback para Pagamento por
// Referência e Gateway de Pagamentos Online").
//
// Corpo esperado:
// {
//   "merchantTransactionId": "ZG...", "ekwanzaTransactionId": 123123,
//   "operationStatus": 1,
//   "operationData": { "amount": 150.0, "merchantIdentifier": "06594969",
//                      "referenceType": "GPO" }
// }
//
// operationStatus: 1 pago · 3 cancelado/expirado · 4 recusado · 5 erro
// A resposta deve ser 2xx com { "status": "0" } quando actualizámos os dados.
//
// URL a registar na AppyPay:
//   https://<PROJECT_REF>.supabase.co/functions/v1/appypay-webhook
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const formatKz = (v: number) =>
  `${Number(v).toLocaleString("pt-AO").replace(/,/g, ".")} Kz`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const payload = await req.json();
    console.log("appypay-webhook payload:", JSON.stringify(payload));

    const mtid = String(payload?.merchantTransactionId ?? "").trim();
    const operationStatus = Number(payload?.operationStatus);
    if (!mtid) return json({ status: "1", error: "merchantTransactionId em falta" }, 400);

    const { data: charge } = await admin
      .from("appypay_charges")
      .select("id, order_id, user_id, amount, status, method")
      .eq("merchant_transaction_id", mtid)
      .maybeSingle();

    if (!charge) {
      console.error("Cobrança não encontrada para", mtid);
      // 200 + status 1 = recebemos, mas não actualizámos nada do nosso lado.
      return json({ status: "1" });
    }

    const newStatus =
      operationStatus === 1 ? "paid" :
      operationStatus === 3 ? "cancelled" :
      operationStatus === 4 ? "refused" : "error";

    await admin
      .from("appypay_charges")
      .update({
        status: newStatus,
        operation_status: Number.isFinite(operationStatus) ? operationStatus : null,
        ekwanza_transaction_id: payload?.ekwanzaTransactionId
          ? String(payload.ekwanzaTransactionId)
          : null,
        raw_callback: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", charge.id);

    // Só um pagamento efectivamente concluído confirma o pedido.
    if (newStatus !== "paid") return json({ status: "0" });
    if (charge.status === "paid") return json({ status: "0" }); // callback repetido

    const { data: order } = await admin
      .from("orders")
      .select("id, order_number, total, user_id")
      .eq("id", charge.order_id)
      .maybeSingle();

    await admin
      .from("orders")
      .update({
        status: "confirmed",
        payment_verified: true,
        payment_paid_at: new Date().toISOString(),
      })
      .eq("id", charge.order_id);

    const ref = String(order?.order_number ?? charge.order_id).slice(0, 8).toUpperCase();
    const total = Number(order?.total ?? charge.amount);
    const methodLabel = charge.method === "gpo" ? "Multicaixa Express" : "Referência Multicaixa";

    // ── Notificação ao comprador ──
    if (charge.user_id) {
      await admin.from("notifications").insert({
        user_id: charge.user_id,
        title: `✅ Pagamento confirmado — Pedido #${ref}`,
        message:
          `Recebemos o seu pagamento de ${formatKz(total)} via ${methodLabel}.\n` +
          `O pedido foi confirmado e já segue para preparação pelo vendedor.`,
        type: "payment_confirmed",
        link_url: `/pedido/${charge.order_id}`,
        is_read: false,
      } as any);
    }

    // ── Notificação aos vendedores do pedido ──
    const { data: items } = await admin
      .from("order_items")
      .select("quantity, products(title, seller_id)")
      .eq("order_id", charge.order_id);

    const bySeller = new Map<string, string[]>();
    for (const it of items ?? []) {
      const p: any = (it as any).products;
      if (!p?.seller_id) continue;
      const lines = bySeller.get(p.seller_id) ?? [];
      lines.push(`• ${(it as any).quantity}× ${p.title}`);
      bySeller.set(p.seller_id, lines);
    }

    if (bySeller.size > 0) {
      const { data: sellers } = await admin
        .from("sellers")
        .select("id, user_id")
        .in("id", Array.from(bySeller.keys()));

      const rows = (sellers ?? [])
        .filter((s: any) => s.user_id)
        .map((s: any) => ({
          user_id: s.user_id,
          title: `💰 Pagamento confirmado — Pedido #${ref}`,
          message:
            `O cliente pagou ${formatKz(total)} via ${methodLabel}.\n\n` +
            `${(bySeller.get(s.id) ?? []).join("\n")}\n\n` +
            `Prepare a encomenda para envio.`,
          type: "order_paid",
          link_url: `/painel-vendedor?pedido=${charge.order_id}`,
          is_read: false,
        }));

      if (rows.length > 0) await admin.from("notifications").insert(rows as any);
    }

    return json({ status: "0" });
  } catch (e: any) {
    console.error("appypay-webhook:", e);
    return json({ status: "1", error: e?.message ?? "erro" }, 500);
  }
});
