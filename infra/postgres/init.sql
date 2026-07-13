-- Runs once, on first container init, against POSTGRES_DB as the superuser.
-- Provisions the roles and databases the apps expect (see apps/*/.env.example).

-- Application roles
CREATE ROLE hakeems WITH LOGIN PASSWORD 'hakeems';
CREATE ROLE strapi WITH LOGIN PASSWORD 'strapi';

-- Vendure database
CREATE DATABASE hakeems_vendure OWNER hakeems;

-- Strapi database (hyphenated name must be quoted)
CREATE DATABASE "hakeems-strapi" OWNER strapi;

-- Ensure each role fully owns its database's public schema (Postgres 15+ locks it down)
\connect hakeems_vendure
ALTER SCHEMA public OWNER TO hakeems;
GRANT ALL ON SCHEMA public TO hakeems;

\connect "hakeems-strapi"
ALTER SCHEMA public OWNER TO strapi;
GRANT ALL ON SCHEMA public TO strapi;
