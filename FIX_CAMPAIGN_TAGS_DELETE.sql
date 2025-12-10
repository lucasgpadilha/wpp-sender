-- Drop the existing strict constraint for campaigns
ALTER TABLE campanhas_tags DROP CONSTRAINT IF EXISTS campanhas_tags_tags_id_foreign;

-- Add the new constraint with ON DELETE CASCADE
ALTER TABLE campanhas_tags 
ADD CONSTRAINT campanhas_tags_tags_id_foreign 
FOREIGN KEY (tags_id) 
REFERENCES tags(id) 
ON DELETE CASCADE;
