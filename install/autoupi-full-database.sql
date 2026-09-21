--
-- PostgreSQL database dump
--

\restrict klFWgKdZ0cZvoTVMYvn5HKjY8UKZThND5IGjuSpXZmGPUKFx9xsEpWcnG28owjU

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
-- ============ EXTENSIONS ============
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: admin_can_reset_password(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_can_reset_password(target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

DECLARE

  v_caller_is_admin boolean;

BEGIN

  SELECT EXISTS (

    SELECT 1 FROM public.profiles

    WHERE id = auth.uid() AND role = 'admin'

  ) INTO v_caller_is_admin;

  RETURN v_caller_is_admin;

END;

$$;


--
-- Name: admin_delete_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_user(target_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$

DECLARE

  v_caller_is_admin boolean;

BEGIN

  -- Caller admin hai?

  SELECT EXISTS (

    SELECT 1 FROM public.profiles

    WHERE id = auth.uid() AND role = 'admin'

  ) INTO v_caller_is_admin;



  IF NOT v_caller_is_admin THEN

    RAISE EXCEPTION 'Only admins can delete users';

  END IF;



  -- Khud ko delete nahi kar sakta

  IF target_user_id = auth.uid() THEN

    RAISE EXCEPTION 'You cannot delete your own account';

  END IF;



  -- User delete (cascade se profiles, merchants, subs sab delete)

  DELETE FROM auth.users WHERE id = target_user_id;

END;

$$;


--
-- Name: archive_paid_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archive_paid_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

BEGIN

  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') AND NEW.paid_at IS NOT NULL THEN

    INSERT INTO public.payment_history

      (order_id, requested_amount, payable_amount, created_at, paid_at, payer_email, payer_name, paid_email_id)

    VALUES

      (NEW.order_id, NEW.requested_amount, NEW.payable_amount, NEW.created_at, NEW.paid_at, NEW.payer_email, NEW.payer_name, NEW.paid_email_id)

    ON CONFLICT (order_id) DO NOTHING;

  END IF;

  RETURN NEW;

END;

$$;


--
-- Name: assign_admin_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_admin_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

DECLARE

  v_admin_email text;

BEGIN

  -- admin_settings se current admin email lo

  SELECT admin_email INTO v_admin_email

  FROM public.admin_settings WHERE id = 1;

  

  -- Agar user ka email admin email se match kare

  IF v_admin_email IS NOT NULL AND LOWER(NEW.email) = LOWER(v_admin_email) THEN

    NEW.role := 'admin';

    NEW.is_verified := true;

  END IF;

  

  RETURN NEW;

END;

$$;


--
-- Name: expire_subscriptions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_subscriptions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

BEGIN

  -- Profiles update

  UPDATE public.profiles

  SET 

    subscription_status = 'expired',

    updated_at = now()

  WHERE 

    subscription_status = 'active'

    AND subscription_expires_at IS NOT NULL

    AND subscription_expires_at < now();



  -- Subscriptions update

  UPDATE public.subscriptions

  SET 

    payment_status = 'expired',

    updated_at = now()

  WHERE 

    payment_status = 'paid'

    AND expires_at IS NOT NULL

    AND expires_at < now();

END;

$$;


--
-- Name: get_users_needing_reminder(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_users_needing_reminder(days_before integer) RETURNS TABLE(user_id uuid, email text, display_name text, plan text, expires_at timestamp with time zone, days_left integer)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

  SELECT 

    p.id AS user_id,

    p.email::text,

    p.display_name::text,

    p.subscription_plan::text AS plan,

    p.subscription_expires_at AS expires_at,

    CEIL(EXTRACT(EPOCH FROM (p.subscription_expires_at - now())) / 86400)::int AS days_left

  FROM public.profiles p

  WHERE 

    p.subscription_status = 'active'

    AND p.subscription_expires_at IS NOT NULL

    AND p.email IS NOT NULL

    AND p.subscription_expires_at BETWEEN now() AND now() + (days_before || ' days')::interval

    AND NOT EXISTS (

      SELECT 1 FROM public.email_notifications en

      WHERE en.user_id = p.id

        AND en.type = 'expiring_soon'

        AND en.sent_date = CURRENT_DATE

    );

$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'auth'
    AS $$

DECLARE

  v_raw_key TEXT;

  v_prefix TEXT;

  v_hash TEXT;

  v_webhook TEXT;

BEGIN

  INSERT INTO public.profiles (id, email, display_name)

  VALUES (

    NEW.id,

    NEW.email,

    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name',''), split_part(NEW.email,'@',1))

  )

  ON CONFLICT (id) DO NOTHING;



  v_raw_key := 'lk_live_' || encode(gen_random_bytes(24), 'hex');

  v_prefix := substr(v_raw_key, 1, 12);

  v_hash := encode(digest(v_raw_key, 'sha256'), 'hex');

  v_webhook := 'whsec_' || encode(gen_random_bytes(24), 'hex');



  INSERT INTO public.merchants (name, api_key_hash, api_key_prefix, webhook_secret, owner_id)

  VALUES (

    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name',''), split_part(NEW.email,'@',1)),

    v_hash, v_prefix, v_webhook, NEW.id

  )

  ON CONFLICT (owner_id) DO NOTHING;



  INSERT INTO public.profiles_revealed (user_id, api_key_plain)

  VALUES (NEW.id, v_raw_key)

  ON CONFLICT (user_id) DO NOTHING;



  RETURN NEW;

END;

$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

  SELECT EXISTS (

    SELECT 1 FROM public.profiles

    WHERE id = user_id AND role = 'admin'

  );

$$;


--
-- Name: purge_daily_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purge_daily_data() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

BEGIN

  DELETE FROM public.webhook_deliveries;

  DELETE FROM public.payment_history;

  DELETE FROM public.processed_emails;

  DELETE FROM public.orders;

END;

$$;


--
-- Name: schedule_order_webhook(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_order_webhook() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

BEGIN

  IF NEW.webhook_url IS NOT NULL

     AND NEW.status IN ('paid','expired','failed')

     AND (OLD.status IS DISTINCT FROM NEW.status)

     AND NEW.webhook_status = 'pending' THEN

    NEW.next_webhook_at := now();

  END IF;

  RETURN NEW;

END;

$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_actions_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_actions_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    target_user_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    id integer DEFAULT 1 NOT NULL,
    admin_email text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gateway_api_key text,
    gateway_webhook_secret text,
    subscription_upi_id text,
    subscription_payee_name text,
    gateway_base_url text DEFAULT 'https://autuphonepay.vercel.app'::text,
    updated_by uuid,
    gmail_user text,
    gmail_app_password text,
    CONSTRAINT admin_settings_single_row CHECK ((id = 1))
);


--
-- Name: email_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_accounts (
    user_id uuid NOT NULL,
    email_address text NOT NULL,
    app_password text NOT NULL,
    status text DEFAULT 'disconnected'::text NOT NULL,
    last_error text,
    last_checked_at timestamp with time zone,
    connected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email text NOT NULL,
    type text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_date date DEFAULT CURRENT_DATE NOT NULL,
    metadata jsonb
);


--
-- Name: merchant_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: merchants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    api_key_hash text NOT NULL,
    api_key_prefix text NOT NULL,
    webhook_secret text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_id uuid
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    order_id text NOT NULL,
    requested_amount numeric(10,2) NOT NULL,
    payable_amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expiry_at timestamp with time zone NOT NULL,
    paid_at timestamp with time zone,
    payer_email text,
    payer_name text,
    paid_email_id text,
    merchant_id uuid,
    merchant_order_id text,
    webhook_url text,
    success_url text,
    failure_url text,
    customer_email text,
    webhook_status text DEFAULT 'pending'::text NOT NULL,
    webhook_attempts integer DEFAULT 0 NOT NULL,
    next_webhook_at timestamp with time zone,
    last_webhook_at timestamp with time zone,
    failed_at timestamp with time zone,
    upi_pa text,
    upi_pn text
);


--
-- Name: payment_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_history (
    order_id text NOT NULL,
    requested_amount numeric NOT NULL,
    payable_amount numeric NOT NULL,
    created_at timestamp with time zone NOT NULL,
    paid_at timestamp with time zone NOT NULL,
    payer_email text,
    payer_name text,
    paid_email_id text,
    archived_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: processed_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_emails (
    message_id text NOT NULL,
    order_id text,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    display_name text,
    upi_id text,
    payee_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    subscription_plan text,
    subscription_status text DEFAULT 'inactive'::text NOT NULL,
    subscription_started_at timestamp with time zone,
    subscription_expires_at timestamp with time zone,
    whatsapp text,
    CONSTRAINT profiles_plan_check CHECK (((subscription_plan IS NULL) OR (subscription_plan = ANY (ARRAY['basic'::text, 'pro'::text, 'yearly'::text])))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text]))),
    CONSTRAINT profiles_status_check CHECK ((subscription_status = ANY (ARRAY['active'::text, 'expired'::text, 'inactive'::text, 'cancelled'::text])))
);


--
-- Name: profiles_revealed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles_revealed (
    user_id uuid NOT NULL,
    api_key_plain text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan text NOT NULL,
    amount numeric(10,2) NOT NULL,
    duration_days integer NOT NULL,
    payment_order_id text,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    started_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_plan_check CHECK ((plan = ANY (ARRAY['basic'::text, 'pro'::text, 'yearly'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text])))
);


--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id text NOT NULL,
    attempt integer NOT NULL,
    event text NOT NULL,
    url text NOT NULL,
    status_code integer,
    response_body text,
    error text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_actions_log admin_actions_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions_log
    ADD CONSTRAINT admin_actions_log_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: email_accounts email_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_accounts
    ADD CONSTRAINT email_accounts_pkey PRIMARY KEY (user_id);


--
-- Name: email_notifications email_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_pkey PRIMARY KEY (id);


--
-- Name: email_notifications email_notifications_user_id_type_sent_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_user_id_type_sent_date_key UNIQUE (user_id, type, sent_date);


--
-- Name: merchant_domains merchant_domains_merchant_id_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_domains
    ADD CONSTRAINT merchant_domains_merchant_id_domain_key UNIQUE (merchant_id, domain);


--
-- Name: merchant_domains merchant_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_domains
    ADD CONSTRAINT merchant_domains_pkey PRIMARY KEY (id);


--
-- Name: merchants merchants_api_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_api_key_hash_key UNIQUE (api_key_hash);


--
-- Name: merchants merchants_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_owner_id_key UNIQUE (owner_id);


--
-- Name: merchants merchants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- Name: payment_history payment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (order_id);


--
-- Name: processed_emails processed_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_emails
    ADD CONSTRAINT processed_emails_pkey PRIMARY KEY (message_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles_revealed profiles_revealed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles_revealed
    ADD CONSTRAINT profiles_revealed_pkey PRIMARY KEY (user_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: admin_logs_admin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_logs_admin_idx ON public.admin_actions_log USING btree (admin_id);


--
-- Name: admin_logs_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_logs_created_idx ON public.admin_actions_log USING btree (created_at DESC);


--
-- Name: email_notifications_sent_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_notifications_sent_at_idx ON public.email_notifications USING btree (sent_at DESC);


--
-- Name: email_notifications_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_notifications_user_idx ON public.email_notifications USING btree (user_id);


--
-- Name: merchant_domains_merchant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_domains_merchant_id_idx ON public.merchant_domains USING btree (merchant_id);


--
-- Name: orders_merchant_unique_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_merchant_unique_order ON public.orders USING btree (merchant_id, merchant_order_id) WHERE ((merchant_id IS NOT NULL) AND (merchant_order_id IS NOT NULL));


--
-- Name: orders_paid_email_id_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_paid_email_id_uniq ON public.orders USING btree (paid_email_id) WHERE (paid_email_id IS NOT NULL);


--
-- Name: orders_pending_payable_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_pending_payable_unique ON public.orders USING btree (payable_amount) WHERE (status = 'pending'::text);


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: orders_webhook_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_webhook_due ON public.orders USING btree (next_webhook_at) WHERE ((webhook_status = 'pending'::text) AND (webhook_url IS NOT NULL));


--
-- Name: subscriptions_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_created_at_idx ON public.subscriptions USING btree (created_at DESC);


--
-- Name: subscriptions_payment_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_payment_order_id_idx ON public.subscriptions USING btree (payment_order_id);


--
-- Name: subscriptions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_user_id_idx ON public.subscriptions USING btree (user_id);


--
-- Name: profiles assign_admin_role_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER assign_admin_role_trigger BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.assign_admin_role();


--
-- Name: orders orders_archive_paid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_archive_paid AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.archive_paid_order();


--
-- Name: orders trg_schedule_order_webhook; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_schedule_order_webhook BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.schedule_order_webhook();


--
-- Name: admin_settings update_admin_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_accounts update_email_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON public.email_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_actions_log admin_actions_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions_log
    ADD CONSTRAINT admin_actions_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_actions_log admin_actions_log_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions_log
    ADD CONSTRAINT admin_actions_log_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: admin_settings admin_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: email_accounts email_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_accounts
    ADD CONSTRAINT email_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: email_notifications email_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: merchant_domains merchant_domains_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_domains
    ADD CONSTRAINT merchant_domains_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchants merchants_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles_revealed profiles_revealed_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles_revealed
    ADD CONSTRAINT profiles_revealed_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_actions_log Admin insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin insert logs" ON public.admin_actions_log FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: subscriptions Admin manage all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin manage all subscriptions" ON public.subscriptions TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: admin_actions_log Admin view logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin view logs" ON public.admin_actions_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: email_notifications Admins view all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view all notifications" ON public.email_notifications FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: admin_settings Anyone authenticated can read admin email; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authenticated can read admin email" ON public.admin_settings FOR SELECT TO authenticated USING (true);


--
-- Name: email_accounts Deny all client access to email_accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny all client access to email_accounts" ON public.email_accounts TO authenticated, anon USING (false) WITH CHECK (false);


--
-- Name: processed_emails Deny all client access to processed_emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny all client access to processed_emails" ON public.processed_emails TO authenticated, anon USING (false) WITH CHECK (false);


--
-- Name: merchants Deny client deletes on merchants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny client deletes on merchants" ON public.merchants FOR DELETE TO authenticated, anon USING (false);


--
-- Name: merchants Deny client inserts on merchants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny client inserts on merchants" ON public.merchants FOR INSERT TO authenticated, anon WITH CHECK (false);


--
-- Name: profiles_revealed Deny client inserts on profiles_revealed; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny client inserts on profiles_revealed" ON public.profiles_revealed FOR INSERT TO authenticated, anon WITH CHECK (false);


--
-- Name: merchants Deny client updates on merchants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny client updates on merchants" ON public.merchants FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);


--
-- Name: profiles_revealed Deny client updates on profiles_revealed; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny client updates on profiles_revealed" ON public.profiles_revealed FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);


--
-- Name: admin_settings Only admin can update admin settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admin can update admin settings" ON public.admin_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: merchant_domains Owners can delete their merchant domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can delete their merchant domains" ON public.merchant_domains FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.merchants m
  WHERE ((m.id = merchant_domains.merchant_id) AND (m.owner_id = auth.uid())))));


--
-- Name: merchant_domains Owners can insert their merchant domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can insert their merchant domains" ON public.merchant_domains FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.merchants m
  WHERE ((m.id = merchant_domains.merchant_id) AND (m.owner_id = auth.uid())))));


--
-- Name: merchant_domains Owners can view their merchant domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view their merchant domains" ON public.merchant_domains FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.merchants m
  WHERE ((m.id = merchant_domains.merchant_id) AND (m.owner_id = auth.uid())))));


--
-- Name: orders Owners view their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners view their orders" ON public.orders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.merchants m
  WHERE ((m.id = orders.merchant_id) AND (m.owner_id = auth.uid())))));


--
-- Name: payment_history Owners view their payment_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners view their payment_history" ON public.payment_history FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.orders o
     JOIN public.merchants m ON ((m.id = o.merchant_id)))
  WHERE ((o.order_id = payment_history.order_id) AND (m.owner_id = auth.uid())))));


--
-- Name: webhook_deliveries Owners view their webhook_deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners view their webhook_deliveries" ON public.webhook_deliveries FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.orders o
     JOIN public.merchants m ON ((m.id = o.merchant_id)))
  WHERE ((o.order_id = webhook_deliveries.order_id) AND (m.owner_id = auth.uid())))));


--
-- Name: email_notifications Service role full access email_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access email_notifications" ON public.email_notifications TO service_role USING (true) WITH CHECK (true);


--
-- Name: profiles Service role full access profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access profiles" ON public.profiles TO service_role USING (true) WITH CHECK (true);


--
-- Name: subscriptions Service role full access subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access subscriptions" ON public.subscriptions TO service_role USING (true) WITH CHECK (true);


--
-- Name: profiles Users and admins view profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users and admins view profiles" ON public.profiles FOR SELECT TO authenticated USING (((auth.uid() = id) OR public.is_admin(auth.uid())));


--
-- Name: profiles_revealed Users delete own revealed key; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own revealed key" ON public.profiles_revealed FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: merchants Users view own merchant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own merchant" ON public.merchants FOR SELECT TO authenticated USING ((owner_id = auth.uid()));


--
-- Name: profiles_revealed Users view own revealed key; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own revealed key" ON public.profiles_revealed FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users view own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.is_admin(auth.uid())));


--
-- Name: admin_actions_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: email_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: email_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: merchants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

--
-- Name: processed_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.processed_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles_revealed; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles_revealed ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict klFWgKdZ0cZvoTVMYvn5HKjY8UKZThND5IGjuSpXZmGPUKFx9xsEpWcnG28owjU

-- ============ INITIAL DATA ============
INSERT INTO public.admin_settings (id, admin_email)
VALUES (1, 'yashvardhan07581@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- ============ CRON JOBS ============
SELECT cron.unschedule('purge-daily-data-midnight-ist') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-daily-data-midnight-ist');
SELECT cron.schedule('purge-daily-data-midnight-ist', '30 18 * * *', $$SELECT public.purge_daily_data();$$);

SELECT cron.unschedule('expire-subscriptions') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-subscriptions');
SELECT cron.schedule('expire-subscriptions', '0 * * * *', $$SELECT public.expire_subscriptions();$$);

SELECT cron.unschedule('dispatch-webhooks') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-webhooks');
SELECT cron.schedule('dispatch-webhooks', '* * * * *', $$
  SELECT net.http_post(
    url := 'https://ccavanue.cloud/api/public/v1/internal/dispatch-webhooks',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

SELECT cron.unschedule('send-expiry-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-expiry-reminders');
SELECT cron.schedule('send-expiry-reminders', '0 10 * * *', $$
  SELECT net.http_post(
    url := 'https://ccavanue.cloud/api/public/cron/send-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);