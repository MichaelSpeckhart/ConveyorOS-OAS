ALTER TABLE conveyoractivity
    RENAME COLUMN customer_identifier TO customer_id;

ALTER TABLE conveyoractivity
    ALTER COLUMN customer_id TYPE INT USING 0;
