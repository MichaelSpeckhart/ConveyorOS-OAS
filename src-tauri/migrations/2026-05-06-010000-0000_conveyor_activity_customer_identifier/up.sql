ALTER TABLE conveyoractivity
    DROP CONSTRAINT IF EXISTS conveyoractivity_user_id_fkey,
    DROP CONSTRAINT IF EXISTS conveyoractivity_customer_id_fkey;

ALTER TABLE conveyoractivity
    ALTER COLUMN customer_id TYPE VARCHAR USING '';

ALTER TABLE conveyoractivity
    RENAME COLUMN customer_id TO customer_identifier;
