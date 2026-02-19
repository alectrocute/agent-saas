-- Store email for admin listing (set on config put/get/start when we have it)
ALTER TABLE instance_configs ADD COLUMN email TEXT;
