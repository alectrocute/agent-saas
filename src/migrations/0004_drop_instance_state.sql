-- State is now proxied from the instance container; only instance configs are stored in DB.
DROP TABLE IF EXISTS instance_state;
