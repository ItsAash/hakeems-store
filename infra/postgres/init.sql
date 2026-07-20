-- Runs once, on first container init, against POSTGRES_DB as the superuser.
-- Provisions the roles and databases the apps expect (see apps/*/.env.example).

-- Application roles
CREATE ROLE lopho WITH LOGIN PASSWORD 'lopho';
CREATE ROLE strapi WITH LOGIN PASSWORD 'strapi';

-- Vendure database
CREATE DATABASE lopho_vendure OWNER lopho;

-- Strapi database (hyphenated name must be quoted)
CREATE DATABASE "lopho-strapi" OWNER strapi;

-- Medusa database
CREATE DATABASE lopho_medusa OWNER lopho;

-- Ensure each role fully owns its database's public schema (Postgres 15+ locks it down)
\connect lopho_vendure
ALTER SCHEMA public OWNER TO lopho;
GRANT ALL ON SCHEMA public TO lopho;

\connect "lopho-strapi"
ALTER SCHEMA public OWNER TO strapi;
GRANT ALL ON SCHEMA public TO strapi;

\connect lopho_medusa
ALTER SCHEMA public OWNER TO lopho;
GRANT ALL ON SCHEMA public TO lopho;
