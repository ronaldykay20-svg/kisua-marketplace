-- =====================================================================
-- NOTIFICAÇÕES DE SEGUIDORES + ASSISTENTE IA
-- Cola isto no SQL Editor do Supabase e executa (é idempotente).
-- =====================================================================

-- 1) Função utilitária: notifica todos os seguidores de um seller
create or replace function public.notify_followers_of_seller(
  _seller_id uuid,
  _title text,
  _message text,
  _type text,
  _link_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, type, link_url)
  select sf.user_id, _title, _message, _type, _link_url
  from public.seller_follows sf
  where sf.seller_id = _seller_id;
end;
$$;

-- 2) Trigger: novo produto ativo
create or replace function public.trg_notify_new_product()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _seller_name text;
begin
  if (new.is_active is distinct from true) then
    return new;
  end if;
  select name into _seller_name from public.sellers where id = new.seller_id;
  perform public.notify_followers_of_seller(
    new.seller_id,
    coalesce(_seller_name, 'Vendedor') || ' publicou um novo produto',
    new.title,
    'new_product',
    '/produto/' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists on_new_product_notify_followers on public.products;
create trigger on_new_product_notify_followers
after insert on public.products
for each row execute function public.trg_notify_new_product();

-- 3) Trigger: novo story
create or replace function public.trg_notify_new_story()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _seller_name text;
begin
  if (new.is_active is distinct from true) then
    return new;
  end if;
  select name into _seller_name from public.sellers where id = new.seller_id;
  perform public.notify_followers_of_seller(
    new.seller_id,
    coalesce(_seller_name, 'Vendedor') || ' publicou um novo story',
    'Toca para veres a novidade',
    'new_story',
    '/vendedor/' || new.seller_id::text
  );
  return new;
end;
$$;

drop trigger if exists on_new_story_notify_followers on public.seller_stories;
create trigger on_new_story_notify_followers
after insert on public.seller_stories
for each row execute function public.trg_notify_new_story();

-- 4) Trigger: baixa de preço
create or replace function public.trg_notify_price_drop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _seller_name text;
begin
  if new.price is null or old.price is null or new.price >= old.price then
    return new;
  end if;
  select name into _seller_name from public.sellers where id = new.seller_id;
  perform public.notify_followers_of_seller(
    new.seller_id,
    'Baixa de preço — ' || coalesce(_seller_name, 'Vendedor'),
    new.title || ' agora por ' || to_char(new.price, 'FM999G999G990') || ' Kz',
    'promo',
    '/produto/' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists on_price_drop_notify_followers on public.products;
create trigger on_price_drop_notify_followers
after update of price on public.products
for each row execute function public.trg_notify_price_drop();

-- 5) Índice de leitura (acelera a campainha)
create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

-- 6) Ativar assistente IA
insert into public.site_settings (key, value)
values ('feature_ai_shopping_enabled', 'true')
on conflict (key) do update set value = 'true', updated_at = now();
