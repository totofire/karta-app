--
-- PostgreSQL database dump
--

\restrict 6VkXmItRFCpzOU7qnzVcsqcEkJR1sHy6gGjOxJEdfkgI9uCJqduHWfLef2N5wKP

-- Dumped from database version 17.7 (bdd1736)
-- Dumped by pg_dump version 18.1

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

ALTER TABLE IF EXISTS ONLY public."Sesion" DROP CONSTRAINT IF EXISTS "Sesion_mesaId_fkey";
ALTER TABLE IF EXISTS ONLY public."Producto" DROP CONSTRAINT IF EXISTS "Producto_categoriaId_fkey";
ALTER TABLE IF EXISTS ONLY public."Pedido" DROP CONSTRAINT IF EXISTS "Pedido_sesionId_fkey";
ALTER TABLE IF EXISTS ONLY public."ItemPedido" DROP CONSTRAINT IF EXISTS "ItemPedido_productoId_fkey";
ALTER TABLE IF EXISTS ONLY public."ItemPedido" DROP CONSTRAINT IF EXISTS "ItemPedido_pedidoId_fkey";
DROP INDEX IF EXISTS public."Usuario_email_key";
DROP INDEX IF EXISTS public."Sesion_tokenEfimero_key";
DROP INDEX IF EXISTS public."Sesion_mesaId_fechaFin_idx";
DROP INDEX IF EXISTS public."Sector_nombre_key";
DROP INDEX IF EXISTS public."Producto_categoriaId_activo_orden_idx";
DROP INDEX IF EXISTS public."Pedido_sesionId_idx";
DROP INDEX IF EXISTS public."Pedido_estado_fecha_idx";
DROP INDEX IF EXISTS public."Mesa_sector_idx";
DROP INDEX IF EXISTS public."Mesa_qr_token_key";
DROP INDEX IF EXISTS public."Mesa_activo_sector_idx";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."Usuario" DROP CONSTRAINT IF EXISTS "Usuario_pkey";
ALTER TABLE IF EXISTS ONLY public."Sesion" DROP CONSTRAINT IF EXISTS "Sesion_pkey";
ALTER TABLE IF EXISTS ONLY public."Sector" DROP CONSTRAINT IF EXISTS "Sector_pkey";
ALTER TABLE IF EXISTS ONLY public."Producto" DROP CONSTRAINT IF EXISTS "Producto_pkey";
ALTER TABLE IF EXISTS ONLY public."Pedido" DROP CONSTRAINT IF EXISTS "Pedido_pkey";
ALTER TABLE IF EXISTS ONLY public."Mesa" DROP CONSTRAINT IF EXISTS "Mesa_pkey";
ALTER TABLE IF EXISTS ONLY public."ItemPedido" DROP CONSTRAINT IF EXISTS "ItemPedido_pkey";
ALTER TABLE IF EXISTS ONLY public."Configuracion" DROP CONSTRAINT IF EXISTS "Configuracion_pkey";
ALTER TABLE IF EXISTS ONLY public."Categoria" DROP CONSTRAINT IF EXISTS "Categoria_pkey";
ALTER TABLE IF EXISTS public."Usuario" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Sesion" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Sector" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Producto" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Pedido" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Mesa" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."ItemPedido" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Categoria" ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP SEQUENCE IF EXISTS public."Usuario_id_seq";
DROP TABLE IF EXISTS public."Usuario";
DROP SEQUENCE IF EXISTS public."Sesion_id_seq";
DROP TABLE IF EXISTS public."Sesion";
DROP SEQUENCE IF EXISTS public."Sector_id_seq";
DROP TABLE IF EXISTS public."Sector";
DROP SEQUENCE IF EXISTS public."Producto_id_seq";
DROP TABLE IF EXISTS public."Producto";
DROP SEQUENCE IF EXISTS public."Pedido_id_seq";
DROP TABLE IF EXISTS public."Pedido";
DROP SEQUENCE IF EXISTS public."Mesa_id_seq";
DROP TABLE IF EXISTS public."Mesa";
DROP SEQUENCE IF EXISTS public."ItemPedido_id_seq";
DROP TABLE IF EXISTS public."ItemPedido";
DROP TABLE IF EXISTS public."Configuracion";
DROP SEQUENCE IF EXISTS public."Categoria_id_seq";
DROP TABLE IF EXISTS public."Categoria";
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Categoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Categoria" (
    id integer NOT NULL,
    nombre text NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    "imprimirCocina" boolean DEFAULT true NOT NULL
);


--
-- Name: Categoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Categoria_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Categoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Categoria_id_seq" OWNED BY public."Categoria".id;


--
-- Name: Configuracion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Configuracion" (
    id integer DEFAULT 1 NOT NULL,
    "horaApertura" text DEFAULT '08:00'::text NOT NULL,
    "horaCierre" text DEFAULT '00:00'::text NOT NULL,
    "cajaAbierta" boolean DEFAULT true NOT NULL
);


--
-- Name: ItemPedido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ItemPedido" (
    id integer NOT NULL,
    "pedidoId" integer NOT NULL,
    "productoId" integer NOT NULL,
    cantidad integer NOT NULL,
    precio double precision NOT NULL,
    observaciones text
);


--
-- Name: ItemPedido_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ItemPedido_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ItemPedido_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ItemPedido_id_seq" OWNED BY public."ItemPedido".id;


--
-- Name: Mesa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Mesa" (
    id integer NOT NULL,
    nombre text NOT NULL,
    qr_token text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    sector text DEFAULT 'General'::text NOT NULL
);


--
-- Name: Mesa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Mesa_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Mesa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Mesa_id_seq" OWNED BY public."Mesa".id;


--
-- Name: Pedido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Pedido" (
    id integer NOT NULL,
    "sesionId" integer NOT NULL,
    "nombreCliente" text,
    estado text DEFAULT 'PENDIENTE'::text NOT NULL,
    fecha timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    impreso boolean DEFAULT false NOT NULL
);


--
-- Name: Pedido_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Pedido_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Pedido_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Pedido_id_seq" OWNED BY public."Pedido".id;


--
-- Name: Producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Producto" (
    id integer NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    precio double precision NOT NULL,
    imagen text,
    activo boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    "categoriaId" integer NOT NULL
);


--
-- Name: Producto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Producto_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Producto_id_seq" OWNED BY public."Producto".id;


--
-- Name: Sector; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Sector" (
    id integer NOT NULL,
    nombre text NOT NULL,
    orden integer DEFAULT 0 NOT NULL
);


--
-- Name: Sector_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Sector_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Sector_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Sector_id_seq" OWNED BY public."Sector".id;


--
-- Name: Sesion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Sesion" (
    id integer NOT NULL,
    "mesaId" integer NOT NULL,
    "fechaInicio" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fechaFin" timestamp(3) without time zone,
    "totalVenta" double precision DEFAULT 0 NOT NULL,
    "nombreHost" text,
    "expiraEn" timestamp(3) without time zone,
    "tokenEfimero" text
);


--
-- Name: Sesion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Sesion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Sesion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Sesion_id_seq" OWNED BY public."Sesion".id;


--
-- Name: Usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Usuario" (
    id integer NOT NULL,
    nombre text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    rol text DEFAULT 'ADMIN'::text NOT NULL,
    "fechaAlta" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Usuario_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Usuario_id_seq" OWNED BY public."Usuario".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: Categoria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Categoria" ALTER COLUMN id SET DEFAULT nextval('public."Categoria_id_seq"'::regclass);


--
-- Name: ItemPedido id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ItemPedido" ALTER COLUMN id SET DEFAULT nextval('public."ItemPedido_id_seq"'::regclass);


--
-- Name: Mesa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Mesa" ALTER COLUMN id SET DEFAULT nextval('public."Mesa_id_seq"'::regclass);


--
-- Name: Pedido id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Pedido" ALTER COLUMN id SET DEFAULT nextval('public."Pedido_id_seq"'::regclass);


--
-- Name: Producto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Producto" ALTER COLUMN id SET DEFAULT nextval('public."Producto_id_seq"'::regclass);


--
-- Name: Sector id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sector" ALTER COLUMN id SET DEFAULT nextval('public."Sector_id_seq"'::regclass);


--
-- Name: Sesion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sesion" ALTER COLUMN id SET DEFAULT nextval('public."Sesion_id_seq"'::regclass);


--
-- Name: Usuario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Usuario" ALTER COLUMN id SET DEFAULT nextval('public."Usuario_id_seq"'::regclass);


--
-- Data for Name: Categoria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Categoria" (id, nombre, orden, "imprimirCocina") FROM stdin;
1	Cervezas	1	f
2	Hamburguesas	2	t
3	Bebidas sin Alcohol	3	f
4	menu ejecutivo	4	t
\.


--
-- Data for Name: Configuracion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Configuracion" (id, "horaApertura", "horaCierre", "cajaAbierta") FROM stdin;
\.


--
-- Data for Name: ItemPedido; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ItemPedido" (id, "pedidoId", "productoId", cantidad, precio, observaciones) FROM stdin;
1	1	1	2	1500	
2	1	4	2	3500	
3	2	4	3	3500	
4	2	11	3	222	
5	3	11	3	222	
6	4	4	4	3500	
7	5	4	2	3500	
8	6	11	3	222	
9	7	11	3	222	
10	8	2	3	1800	
11	8	4	2	3500	
12	8	5	1	4500	
13	9	10	2	5000	
14	10	1	2	1500	
15	10	13	2	20000	
16	11	11	2	222	
17	12	3	2	1700	
18	12	13	2	20000	
19	13	9	3	1000	
20	13	12	2	1000	
21	14	3	3	1700	
22	14	13	1	20000	
\.


--
-- Data for Name: Mesa; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Mesa" (id, nombre, qr_token, activo, sector) FROM stdin;
1	Mesa 1	m1	t	Interior
2	Mesa 2	m2	t	Interior
3	Mesa 3	m3	t	Interior
4	Mesa 4	m4	t	Patio
5	Mesa 5	m5	t	Patio
6	Barra 1	b1	t	Barra
7	Mesa barrra	mesa-barrra	t	Barra
9	Mesa 15	mesa-15	t	Interior
11	Mesa 6	mesa-6	t	Interior
8	Mesa 14	mesa-14	t	Interior
10	Mesa 12	mesa-12	t	Interior
12	Mesa 13	mesa-13	t	Interior
13	Mesa 11	mesa-11	t	Interior
15	Mesa 10	mesa-10	t	Interior
16	Mesa 8	mesa-8	t	Interior
17	Mesa 7	mesa-7	t	Interior
14	Mesa 9	mesa-9	t	Interior
18	Mesa 16	mesa-16	t	Interior
19	Mesa 19	mesa-19	t	Interior
21	Mesa 20	mesa-20	t	Interior
20	Mesa 18	mesa-18	t	Interior
22	Mesa 17	mesa-17	t	Interior
23	Mesa 21	mesa-21	t	Interior
25	Mesa 25	mesa-25	t	Interior
26	Mesa 22	mesa-22	t	Interior
27	Mesa 24	mesa-24	t	Interior
24	Mesa 23	mesa-23	t	Interior
\.


--
-- Data for Name: Pedido; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Pedido" (id, "sesionId", "nombreCliente", estado, fecha, impreso) FROM stdin;
2	1	tomas	ENTREGADO	2026-02-03 23:12:03.096	f
1	1	tomas	ENTREGADO	2026-02-03 22:33:34.561	f
4	1	ppe	ENTREGADO	2026-02-03 23:13:18.647	f
3	1	tomas	ENTREGADO	2026-02-03 23:12:39.043	f
8	2	Tomas	ENTREGADO	2026-02-04 00:35:06.438	f
6	1	tomas	ENTREGADO	2026-02-03 23:28:02.635	f
5	1	tomas	ENTREGADO	2026-02-03 23:27:25.82	f
7	1	toto	ENTREGADO	2026-02-03 23:32:36.766	f
9	3	Toto	ENTREGADO	2026-02-04 00:46:36.395	f
10	4	tomas	ENTREGADO	2026-02-04 16:28:22.385	f
11	4	pepe	ENTREGADO	2026-02-04 16:28:52.039	f
12	4	pepe	ENTREGADO	2026-02-04 16:29:07.411	f
13	5	Tomas	ENTREGADO	2026-02-04 17:49:33.761	f
14	5	Tito	ENTREGADO	2026-02-04 17:49:52.619	f
\.


--
-- Data for Name: Producto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Producto" (id, nombre, descripcion, precio, imagen, activo, orden, "categoriaId") FROM stdin;
1	Liso Santa Fe	Cerveza artesanal bien helada	1500	\N	t	1	1
2	IPA	India Pale Ale arom├ítica	1800	\N	t	2	1
4	Hamburguesa Cl├ísica	Carne, lechuga, tomate, cebolla	3500	\N	t	1	2
5	Hamburguesa Completa	Carne, queso, bacon, huevo, verduras	4500	\N	t	2	2
6	Hamburguesa Veggie	Hamburguesa de lentejas con verduras	3200	\N	t	3	2
8	Agua Mineral	500ml	500	\N	t	2	3
3	Porter	Cerveza negra cremosa	1700	\N	t	3	1
7	Coca Cola	500ml	500	\N	t	1	3
10	papas con chedar		5000	\N	t	0	3
11	prueba error		222	\N	t	0	1
12	prueba nro mil		1000	\N	t	0	1
9	pepe		1000	\N	t	0	1
13	pizza con pepe	pizza	20000	\N	t	0	2
\.


--
-- Data for Name: Sector; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sector" (id, nombre, orden) FROM stdin;
1	Interior	1
2	Patio	2
3	Barra	3
4	veread	10
\.


--
-- Data for Name: Sesion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sesion" (id, "mesaId", "fechaInicio", "fechaFin", "totalVenta", "nombreHost", "expiraEn", "tokenEfimero") FROM stdin;
2	7	2026-02-04 00:35:06.377	2026-02-04 00:36:08.449	16900	\N	\N	\N
3	7	2026-02-04 00:46:36.37	2026-02-04 14:09:27.058	10000	\N	\N	\N
1	6	2026-02-03 22:33:33.75	2026-02-04 14:09:29.779	44164	\N	\N	\N
4	6	2026-02-04 16:27:49.173	2026-02-04 16:30:39.206	86844	\N	2026-02-04 20:27:49.172	7b85effa81e02058940240b37e0f74d88e9de26ea5da46ad32feafd40ccb014c
5	6	2026-02-04 17:49:24.614	2026-02-04 17:50:24.438	30100	\N	2026-02-04 21:49:24.613	f07033675a9e0eba089865c8810b4f7593153021451a8c959738cf302ccd57d0
\.


--
-- Data for Name: Usuario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Usuario" (id, nombre, email, password, rol, "fechaAlta") FROM stdin;
1	Administrador	admin@karta.com	123	ADMIN	2026-02-03 22:15:55.468
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
2c6ee01a-4c3e-469a-aac8-127418fc4bb4	db8b1f8b86c6d2ca4479c774010f20e7bef4d33f93ee71083bb224ac99301e9f	2026-02-03 22:13:59.973987+00	20260203221357_init	\N	\N	2026-02-03 22:13:58.826771+00	1
7bd32952-561b-4b36-a0c6-ebd7a1291f25	d111da9af91e6a5cbadc4c4398ad21efc6775c197d192f6511183c729cac578a	2026-02-04 15:44:34.945817+00	20260204154433_add_token_efimero	\N	\N	2026-02-04 15:44:33.983551+00	1
\.


--
-- Name: Categoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Categoria_id_seq"', 4, true);


--
-- Name: ItemPedido_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ItemPedido_id_seq"', 22, true);


--
-- Name: Mesa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Mesa_id_seq"', 27, true);


--
-- Name: Pedido_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Pedido_id_seq"', 14, true);


--
-- Name: Producto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Producto_id_seq"', 13, true);


--
-- Name: Sector_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Sector_id_seq"', 4, true);


--
-- Name: Sesion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Sesion_id_seq"', 5, true);


--
-- Name: Usuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Usuario_id_seq"', 1, true);


--
-- Name: Categoria Categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Categoria"
    ADD CONSTRAINT "Categoria_pkey" PRIMARY KEY (id);


--
-- Name: Configuracion Configuracion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Configuracion"
    ADD CONSTRAINT "Configuracion_pkey" PRIMARY KEY (id);


--
-- Name: ItemPedido ItemPedido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ItemPedido"
    ADD CONSTRAINT "ItemPedido_pkey" PRIMARY KEY (id);


--
-- Name: Mesa Mesa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Mesa"
    ADD CONSTRAINT "Mesa_pkey" PRIMARY KEY (id);


--
-- Name: Pedido Pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Pedido"
    ADD CONSTRAINT "Pedido_pkey" PRIMARY KEY (id);


--
-- Name: Producto Producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Producto"
    ADD CONSTRAINT "Producto_pkey" PRIMARY KEY (id);


--
-- Name: Sector Sector_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sector"
    ADD CONSTRAINT "Sector_pkey" PRIMARY KEY (id);


--
-- Name: Sesion Sesion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sesion"
    ADD CONSTRAINT "Sesion_pkey" PRIMARY KEY (id);


--
-- Name: Usuario Usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Usuario"
    ADD CONSTRAINT "Usuario_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Mesa_activo_sector_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Mesa_activo_sector_idx" ON public."Mesa" USING btree (activo, sector);


--
-- Name: Mesa_qr_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Mesa_qr_token_key" ON public."Mesa" USING btree (qr_token);


--
-- Name: Mesa_sector_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Mesa_sector_idx" ON public."Mesa" USING btree (sector);


--
-- Name: Pedido_estado_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Pedido_estado_fecha_idx" ON public."Pedido" USING btree (estado, fecha);


--
-- Name: Pedido_sesionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Pedido_sesionId_idx" ON public."Pedido" USING btree ("sesionId");


--
-- Name: Producto_categoriaId_activo_orden_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Producto_categoriaId_activo_orden_idx" ON public."Producto" USING btree ("categoriaId", activo, orden);


--
-- Name: Sector_nombre_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Sector_nombre_key" ON public."Sector" USING btree (nombre);


--
-- Name: Sesion_mesaId_fechaFin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Sesion_mesaId_fechaFin_idx" ON public."Sesion" USING btree ("mesaId", "fechaFin");


--
-- Name: Sesion_tokenEfimero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Sesion_tokenEfimero_key" ON public."Sesion" USING btree ("tokenEfimero");


--
-- Name: Usuario_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Usuario_email_key" ON public."Usuario" USING btree (email);


--
-- Name: ItemPedido ItemPedido_pedidoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ItemPedido"
    ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES public."Pedido"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ItemPedido ItemPedido_productoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ItemPedido"
    ADD CONSTRAINT "ItemPedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES public."Producto"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Pedido Pedido_sesionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Pedido"
    ADD CONSTRAINT "Pedido_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES public."Sesion"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Producto Producto_categoriaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Producto"
    ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES public."Categoria"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Sesion Sesion_mesaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sesion"
    ADD CONSTRAINT "Sesion_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES public."Mesa"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict 6VkXmItRFCpzOU7qnzVcsqcEkJR1sHy6gGjOxJEdfkgI9uCJqduHWfLef2N5wKP

