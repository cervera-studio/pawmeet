-- Migrate domain enum values from Italian to English
-- dog_profiles table

-- DogSize: piccola → small, media → medium, grande → large, gigante → giant (toy stays)
UPDATE dog_profiles SET size = 'small' WHERE size = 'piccola';
UPDATE dog_profiles SET size = 'medium' WHERE size = 'media';
UPDATE dog_profiles SET size = 'large' WHERE size = 'grande';
UPDATE dog_profiles SET size = 'giant' WHERE size = 'gigante';

-- Gender: maschio → male, femmina → female
UPDATE dog_profiles SET gender = 'male' WHERE gender = 'maschio';
UPDATE dog_profiles SET gender = 'female' WHERE gender = 'femmina';

-- EnergyLevel: bassa → low, media → medium, alta → high, molto_alta → very_high
UPDATE dog_profiles SET energy_level = 'low' WHERE energy_level = 'bassa';
UPDATE dog_profiles SET energy_level = 'medium' WHERE energy_level = 'media';
UPDATE dog_profiles SET energy_level = 'high' WHERE energy_level = 'alta';
UPDATE dog_profiles SET energy_level = 'very_high' WHERE energy_level = 'molto_alta';

-- BehaviorWithDogs: molto_socievole → very_friendly, socievole → friendly, selettivo → selective, reattivo → reactive
UPDATE dog_profiles SET behavior_with_dogs = 'very_friendly' WHERE behavior_with_dogs = 'molto_socievole';
UPDATE dog_profiles SET behavior_with_dogs = 'friendly' WHERE behavior_with_dogs = 'socievole';
UPDATE dog_profiles SET behavior_with_dogs = 'selective' WHERE behavior_with_dogs = 'selettivo';
UPDATE dog_profiles SET behavior_with_dogs = 'reactive' WHERE behavior_with_dogs = 'reattivo';

-- BehaviorWithPeople: molto_socievole → very_friendly, socievole → friendly, timido → shy, diffidente → wary
UPDATE dog_profiles SET behavior_with_people = 'very_friendly' WHERE behavior_with_people = 'molto_socievole';
UPDATE dog_profiles SET behavior_with_people = 'friendly' WHERE behavior_with_people = 'socievole';
UPDATE dog_profiles SET behavior_with_people = 'shy' WHERE behavior_with_people = 'timido';
UPDATE dog_profiles SET behavior_with_people = 'wary' WHERE behavior_with_people = 'diffidente';

-- LeashBehavior: eccellente → excellent, buono → good, in_addestramento → in_training, difficile → difficult
UPDATE dog_profiles SET leash_behavior = 'excellent' WHERE leash_behavior = 'eccellente';
UPDATE dog_profiles SET leash_behavior = 'good' WHERE leash_behavior = 'buono';
UPDATE dog_profiles SET leash_behavior = 'in_training' WHERE leash_behavior = 'in_addestramento';
UPDATE dog_profiles SET leash_behavior = 'difficult' WHERE leash_behavior = 'difficile';

-- RecallReliability: affidabile → reliable, parziale → partial, non_affidabile → unreliable
UPDATE dog_profiles SET recall_reliability = 'reliable' WHERE recall_reliability = 'affidabile';
UPDATE dog_profiles SET recall_reliability = 'partial' WHERE recall_reliability = 'parziale';
UPDATE dog_profiles SET recall_reliability = 'unreliable' WHERE recall_reliability = 'non_affidabile';

-- WalkPrefTime (JSONB array): replace Italian values with English equivalents
UPDATE dog_profiles SET walk_pref_time = (
  SELECT jsonb_agg(
    CASE val
      WHEN 'mattina_presto' THEN 'early_morning'
      WHEN 'mattina' THEN 'morning'
      WHEN 'pomeriggio' THEN 'afternoon'
      WHEN 'sera' THEN 'evening'
      WHEN 'sera_tardi' THEN 'late_evening'
      ELSE val
    END
  )
  FROM jsonb_array_elements_text(walk_pref_time) AS val
)
WHERE walk_pref_time IS NOT NULL;

-- WalkPrefTerrain (JSONB array): replace Italian values with English equivalents
UPDATE dog_profiles SET walk_pref_terrain = (
  SELECT jsonb_agg(
    CASE val
      WHEN 'urbano' THEN 'urban'
      WHEN 'parco' THEN 'park'
      WHEN 'campagna' THEN 'countryside'
      WHEN 'spiaggia' THEN 'beach'
      WHEN 'montagna' THEN 'mountain'
      ELSE val
    END
  )
  FROM jsonb_array_elements_text(walk_pref_terrain) AS val
)
WHERE walk_pref_terrain IS NOT NULL;

-- Drop old CHECK constraints and recreate with English values
ALTER TABLE dog_profiles DROP CONSTRAINT IF EXISTS dog_profiles_size_valid;
ALTER TABLE dog_profiles ADD CONSTRAINT dog_profiles_size_valid CHECK (size IN ('toy', 'small', 'medium', 'large', 'giant'));

ALTER TABLE dog_profiles DROP CONSTRAINT IF EXISTS dog_profiles_gender_valid;
ALTER TABLE dog_profiles ADD CONSTRAINT dog_profiles_gender_valid CHECK (gender IN ('male', 'female'));

ALTER TABLE dog_profiles DROP CONSTRAINT IF EXISTS dog_profiles_energy_level_valid;
ALTER TABLE dog_profiles ADD CONSTRAINT dog_profiles_energy_level_valid CHECK (energy_level IN ('low', 'medium', 'high', 'very_high'));

ALTER TABLE dog_profiles DROP CONSTRAINT IF EXISTS dog_profiles_behavior_dogs_valid;
ALTER TABLE dog_profiles ADD CONSTRAINT dog_profiles_behavior_dogs_valid CHECK (behavior_with_dogs IN ('very_friendly', 'friendly', 'selective', 'reactive'));

ALTER TABLE dog_profiles DROP CONSTRAINT IF EXISTS dog_profiles_behavior_people_valid;
ALTER TABLE dog_profiles ADD CONSTRAINT dog_profiles_behavior_people_valid CHECK (behavior_with_people IN ('very_friendly', 'friendly', 'shy', 'wary'));

ALTER TABLE dog_profiles DROP CONSTRAINT IF EXISTS dog_profiles_leash_behavior_valid;
ALTER TABLE dog_profiles ADD CONSTRAINT dog_profiles_leash_behavior_valid CHECK (leash_behavior IN ('excellent', 'good', 'in_training', 'difficult'));

ALTER TABLE dog_profiles DROP CONSTRAINT IF EXISTS dog_profiles_recall_valid;
ALTER TABLE dog_profiles ADD CONSTRAINT dog_profiles_recall_valid CHECK (recall_reliability IS NULL OR recall_reliability IN ('reliable', 'partial', 'unreliable'));

-- breeds table
UPDATE breeds SET size_category = 'small' WHERE size_category = 'piccola';
UPDATE breeds SET size_category = 'medium' WHERE size_category = 'media';
UPDATE breeds SET size_category = 'large' WHERE size_category = 'grande';
UPDATE breeds SET size_category = 'giant' WHERE size_category = 'gigante';

ALTER TABLE breeds DROP CONSTRAINT IF EXISTS breeds_size_category_valid;
ALTER TABLE breeds ADD CONSTRAINT breeds_size_category_valid CHECK (size_category IS NULL OR size_category IN ('toy', 'small', 'medium', 'large', 'giant'));
