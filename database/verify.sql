\set ON_ERROR_STOP on

SELECT PostGIS_Version() AS postgis_version;

DO $$
DECLARE
  vessel_count integer;
  required_table_count integer;
BEGIN
  SELECT count(*) INTO vessel_count FROM vessels;

  IF vessel_count <> 3 THEN
    RAISE EXCEPTION 'Expected 3 vessels, found %', vessel_count;
  END IF;

  SELECT count(*) INTO required_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('vessels', 'vessel_positions', 'vessel_motions');

  IF required_table_count <> 3 THEN
    RAISE EXCEPTION 'Expected 3 application tables, found %', required_table_count;
  END IF;
END $$;

SELECT id, imo_code, display_name
FROM vessels
ORDER BY id;
