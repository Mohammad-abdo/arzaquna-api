-- Add rating and isBestProduct columns to Product table
-- Run this SQL on your production database

ALTER TABLE `Product` 
ADD COLUMN `rating` DOUBLE NULL DEFAULT 0,
ADD COLUMN `isBestProduct` BOOLEAN NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX `Product_isBestProduct_idx` ON `Product`(`isBestProduct`);

