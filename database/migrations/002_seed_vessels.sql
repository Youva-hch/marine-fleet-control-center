INSERT INTO vessels (imo_code, display_name)
VALUES
  ('IMO1', 'IMO1'),
  ('IMO2', 'IMO2'),
  ('IMO3', 'IMO3')
ON CONFLICT (imo_code) DO UPDATE
SET display_name = EXCLUDED.display_name;
