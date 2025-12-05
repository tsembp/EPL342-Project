SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

-- Step 1: Drop the existing constraint
IF EXISTS (
    SELECT 1 
    FROM sys.check_constraints 
    WHERE name = 'CK_VehicleDocument_DocType' 
      AND parent_object_id = OBJECT_ID('dbo.VehicleDocument')
)
BEGIN
    ALTER TABLE [dbo].[VehicleDocument]
    DROP CONSTRAINT [CK_VehicleDocument_DocType];
    PRINT 'Dropped existing CK_VehicleDocument_DocType constraint';
END
GO

-- Step 2: Update existing VEHICLE_IMAGE records to VEHICLE_IMAGE_EXTERIOR
UPDATE [dbo].[VehicleDocument]
SET DocType = 'VEHICLE_IMAGE_EXTERIOR'
WHERE DocType = 'VEHICLE_IMAGE';

DECLARE @UpdatedRows INT = @@ROWCOUNT;
PRINT 'Updated ' + CAST(@UpdatedRows AS VARCHAR(10)) + ' existing VEHICLE_IMAGE records to VEHICLE_IMAGE_EXTERIOR';
GO

-- Step 3: Add the new constraint with updated document types
ALTER TABLE [dbo].[VehicleDocument]
ADD CONSTRAINT [CK_VehicleDocument_DocType] CHECK ([DocType] IN (
    'VEHICLE_REGISTRATION',
    'MOT_CERTIFICATE',
    'VEHICLE_CLASSIFICATION_CERTIFICATE',
    'VEHICLE_IMAGE_INTERIOR',
    'VEHICLE_IMAGE_EXTERIOR'
));
PRINT 'Added new CK_VehicleDocument_DocType constraint with interior and exterior image types';
GO

COMMIT TRANSACTION;
PRINT 'Migration completed successfully!';
GO
