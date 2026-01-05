-- Your SQL goes here
INSERT INTO slots (slot_number, slot_state)
SELECT
    gs AS slot_number,
    'empty' AS slot_state
FROM generate_series(1, 100) AS gs
ON CONFLICT (slot_number) DO NOTHING;
