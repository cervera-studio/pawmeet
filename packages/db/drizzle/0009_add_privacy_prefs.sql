-- Add privacy_prefs JSONB column to users table
ALTER TABLE "users" ADD COLUMN "privacy_prefs" jsonb DEFAULT '{"profileVisible":true,"approximateDistance":false,"showLastSeen":true}'::jsonb;
