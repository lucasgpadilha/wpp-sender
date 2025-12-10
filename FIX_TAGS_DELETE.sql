-- Drop the existing strict constraint
ALTER TABLE contatos_tags DROP CONSTRAINT IF EXISTS contatos_tags_tags_id_foreign;

-- Add the new constraint with ON DELETE CASCADE
ALTER TABLE contatos_tags 
ADD CONSTRAINT contatos_tags_tags_id_foreign 
FOREIGN KEY (tags_id) 
REFERENCES tags(id) 
ON DELETE CASCADE;
