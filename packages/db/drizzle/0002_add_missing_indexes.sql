CREATE INDEX "dog_photos_dog_id_idx" ON "dog_photos" USING btree ("dog_id");--> statement-breakpoint
CREATE INDEX "swipes_swiper_dog_id_idx" ON "swipes" USING btree ("swiper_dog_id");