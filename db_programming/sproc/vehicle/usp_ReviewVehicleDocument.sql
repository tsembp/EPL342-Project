CREATE OR ALTER PROCEDURE dbo.usp_ReviewVehicleDocument
(
    @OperatorId     UNIQUEIDENTIFIER,
    @VehDocId       INT,
    @NewStatus      NVARCHAR(20),          -- 'Accepted', 'Rejected'
    @ReviewComments NVARCHAR(1000) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate @NewStatus
    IF @NewStatus NOT IN ('Accepted', 'Rejected')
    BEGIN
        RAISERROR('@NewStatus must be ''Accepted'' or ''Rejected''.', 16, 1);
        RETURN;
    END;

    -- Validate operator
    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[Operator] O
        WHERE O.OperatorId = @OperatorId
          AND O.Verified = 1
    )
    BEGIN
        RAISERROR('Invalid or unverified operator.', 16, 1);
        RETURN;
    END;

    -- Get vehicle & doc info
    DECLARE
        @VehicleId UNIQUEIDENTIFIER,
        @DocType   NVARCHAR(100);

    SELECT
        @VehicleId = VD.VehicleId,
        @DocType   = VD.DocType
    FROM [dbo].[VehicleDocument] VD
    WHERE VD.VehDocId = @VehDocId;

    IF @VehicleId IS NULL
    BEGIN
        RAISERROR('Vehicle document not found.', 16, 1);
        RETURN;
    END;

    -- Update document review info
    UPDATE [dbo].[VehicleDocument]
    SET
        Status               = @NewStatus,
        Accepted             = CASE WHEN @NewStatus = 'Accepted' THEN 1 ELSE 0 END,
        ReviewedByOperatorId = @OperatorId,
        ReviewedAt           = SYSUTCDATETIME(),
        ReviewComments       = @ReviewComments
    WHERE VehDocId = @VehDocId;

    -- If rejected, nothing more to do
    IF @NewStatus = 'Rejected'
    BEGIN
        RETURN;
    END;

    -- If accepted, check if ALL required vehicle docs are approved
    DECLARE @RequiredDocCount INT = 4; -- VEHICLE_REG, MOT, CLASSIFICATION, IMAGE
    DECLARE @ApprovedDocCount INT;

    SELECT @ApprovedDocCount = COUNT(DISTINCT DocType)
    FROM [dbo].[VehicleDocument]
    WHERE VehicleId = @VehicleId
      AND Status = 'Accepted'
      AND (ExpiryDate IS NULL OR ExpiryDate > GETUTCDATE())
      AND DocType IN (
            'VEHICLE_REGISTRATION',
            'MOT_CERTIFICATE',
            'VEHICLE_CLASSIFICATION_CERTIFICATE',
            'VEHICLE_IMAGE'
      );

    IF @ApprovedDocCount < @RequiredDocCount
    BEGIN
        -- Not all required docs approved yet
        RETURN;
    END;

    -- All required docs are approved -> mark vehicle as active
    UPDATE [dbo].[Vehicle]
    SET
        Verified = 1,
        Status   = 'Active'
    WHERE VehicleId = @VehicleId;
END;
GO
