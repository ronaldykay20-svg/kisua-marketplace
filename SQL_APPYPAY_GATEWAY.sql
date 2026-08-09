-- =====================================================================
-- GATEWAY DE PAGAMENTOS EMIS / APPYPAY (e-kwanza · pay4all)
-- Multicaixa Express (GPO) + Referência Multicaixa (REF)
-- Cola isto no SQL Editor do Supabase e executa (é idempotente).
-- =====================================================================

-- 1) Colunas extra na tabela de pedidos --------------------------------
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_entity text;
alter table public.orders add column if not exists payment_reference_due timestamptz;
alter table public.orders add column if not exists payment_paid_at timestamptz;

-- 2) Registo de cobranças (auditoria + mapeamento do callback) --------
create table if not exists public.appypay_charges (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid,
  merchant_transaction_id text not null,
  method text not null,
  amount numeric not null,
  charge_id text,
  reference_number text,
  entity text,
  due_date timestamptz,
  status text not null default 'pending',
  ekwanza_transaction_id text,
  operation_status int,
  raw_response jsonb,
  raw_callback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists appypay_charges_mtid_key
  on public.appypay_charges (merchant_transaction_id);
create index if not exists appypay_charges_order_idx
  on public.appypay_charges (order_id);

-- 3) Permissões da Data API (obrigatório no Supabase) ----------------
grant select on public.appypay_charges to authenticated;
grant all on public.appypay_charges to service_role;

-- 4) RLS: cada comprador só vê as suas cobranças ----------------------
alter table public.appypay_charges enable row level security;

drop policy if exists "Utilizador vê as suas cobranças" on public.appypay_charges;
create policy "Utilizador vê as suas cobranças"
on public.appypay_charges
for select
to authenticated
using (user_id = auth.uid());
