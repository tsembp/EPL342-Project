-- =============================================
-- Migration: Vehicle Minimum Price Per Km
-- Description: Add PricePerKm to Vehicle table and remove PerKm/PerMin from ServiceType
-- Date: December 2, 2025
-- =============================================
-- IMPORTANT: Run this script BEFORE running any other SQL files
-- This modifies the existing database schema
-- =============================================

SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT 'Starting vehicle pricing migration...';
GO

-- ================================ Step 1: Add PricePerKm to Vehicle ================================ --
PRINT 'Step 1: Adding PricePerKm column to Vehicle table...';
GO

-- Drop the constraint if it exists (in case of re-run)
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PricePerKm_Positive')
BEGIN
    ALTER TABLE [dbo].[Vehicle] DROP CONSTRAINT [CK_PricePerKm_Positive];
    PRINT 'Dropped existing constraint.';
END
GO

-- Add column if it doesn't exist
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Vehicle') 
    AND name = 'PricePerKm'
)
BEGIN
    PRINT 'Adding PricePerKm column (nullable)...';
    
    -- Add column as nullable first (for existing records)
    ALTER TABLE [dbo].[Vehicle]
    ADD [PricePerKm] DECIMAL(10,2) NULL;
    
    PRINT 'Column added successfully.';
END
ELSE
BEGIN
    PRINT 'PricePerKm column already exists - skipping creation.';
END
GO

-- Update existing NULL values
PRINT 'Setting default values for vehicles with NULL PricePerKm...';
UPDATE [dbo].[Vehicle]
SET [PricePerKm] = 1.00
WHERE [PricePerKm] IS NULL;
PRINT 'Default values updated.';
GO

-- Make column NOT NULL if it's nullable
IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Vehicle') 
    AND name = 'PricePerKm'
    AND is_nullable = 1
)
BEGIN
    PRINT 'Making PricePerKm NOT NULL...';
    ALTER TABLE [dbo].[Vehicle]
    ALTER COLUMN [PricePerKm] DECIMAL(10,2) NOT NULL;
    PRINT 'Column is now NOT NULL.';
END
ELSE
BEGIN
    PRINT 'PricePerKm is already NOT NULL.';
END
GO

-- Add check constraint
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PricePerKm_Positive')
BEGIN
    ALTER TABLE [dbo].[Vehicle] 
    ADD CONSTRAINT [CK_PricePerKm_Positive] CHECK ([PricePerKm] > 0);
    PRINT 'Check constraint added.';
END
ELSE
BEGIN
    PRINT 'Check constraint already exists.';
END
GO

-- ================================ Step 2: Remove PerKm from ServiceType ================================ --
PRINT 'Step 2: Removing PerKm column from ServiceType table...';
GO

IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Servicetype') 
    AND name = 'PerKm'
)
BEGIN
    ALTER TABLE [dbo].[Servicetype]
    DROP COLUMN [PerKm];
    PRINT 'PerKm column removed successfully.';
END
ELSE
BEGIN
    PRINT 'PerKm column does not exist (already removed).';
END
GO

-- ================================ Step 3: Remove PerMin from ServiceType ================================ --
PRINT 'Step 3: Removing PerMin column from ServiceType table...';
GO

IF EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.Servicetype') 
    AND name = 'PerMin'
)
BEGIN
    ALTER TABLE [dbo].[Servicetype]
    DROP COLUMN [PerMin];
    PRINT 'PerMin column removed successfully.';
END
ELSE
BEGIN
    PRINT 'PerMin column does not exist (already removed).';
END
GO

PRINT '========================================';
PRINT 'Vehicle pricing migration completed successfully!';
PRINT '========================================';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Run: db_programming/sproc/vehicle/registration.sql';
PRINT '2. Run: db_programming/sproc/vehicle/usp_UpdateVehiclePricePerKm.sql';
PRINT '3. Run: db_programming/functions/ufn_CalculateRidePrice.sql';
PRINT '4. Run: db_programming/sproc/ride_profiles/usp_get_service_types.sql';
PRINT '5. Run: db_programming/sproc/ride_profiles/usp_create_service_type.sql';
PRINT '6. Run: db_programming/sproc/ride_profiles/usp_update_service_type.sql';
GO
