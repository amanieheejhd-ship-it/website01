-- Database-per-service (one Postgres instance, separate logical databases).
-- Executed once by the postgres image on first init, as the superuser
-- (docker-entrypoint-initdb.d). See docs/ARCHITECTURE.md §7 and DOMAIN-MODEL.md.
--
-- admin-service intentionally has NO database (it is a pure BFF/aggregator).

CREATE DATABASE auth_db;
CREATE DATABASE cms_db;
CREATE DATABASE project_db;
CREATE DATABASE service_db;
CREATE DATABASE contact_db;
CREATE DATABASE quotation_db;
CREATE DATABASE media_db;
CREATE DATABASE notification_db;
