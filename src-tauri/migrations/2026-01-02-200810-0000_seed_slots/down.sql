-- This file should undo anything in `up.sql`
DELETE FROM slots WHERE slot_number BETWEEN 1 AND 100;
