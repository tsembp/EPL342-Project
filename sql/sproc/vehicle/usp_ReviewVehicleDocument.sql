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

    ------------------------------------------------
    -- 1. Validate @NewStatus
    ------------------------------------------------
    IF @NewStatus NOT IN ('Accepted', 'Rejected')
    BEGIN
        RAISERROR('@NewStatus must be ''Accepted'' or ''Rejected''.', 16, 1);
        RETURN;
    END;

    ------------------------------------------------
    -- 2. Validate operator (must exist & be verified)
    ------------------------------------------------
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

    ------------------------------------------------
    -- 3. Get vehicle & doc info
    ------------------------------------------------
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

    ------------------------------------------------
    -- 4. Update the document review info
    ------------------------------------------------
    UPDATE [dbo].[VehicleDocument]
    SET
        Status               = @NewStatus,
        Accepted             = CASE WHEN @NewStatus = 'Accepted' THEN 1 ELSE 0 END,
        ReviewedByOperatorId = @OperatorId,
        ReviewedAt           = SYSUTCDATETIME(),
        ReviewComments       = @ReviewComments
    WHERE VehDocId = @VehDocId;

    -- If rejected, stop here (no auto-approval)
    IF @NewStatus = 'Rejected'
    BEGIN
        RETURN;
    END;

    ------------------------------------------------
    -- 5. Check if ALL required vehicle docs are accepted
    --    (same idea as usp_ReviewPersonDocument: only status & doc types)
    ------------------------------------------------
    DECLARE @RequiredDocCount INT = 5; -- VEHICLE_REGISTRATION, MOT_CERTIFICATE,
                                      -- VEHICLE_CLASSIFICATION_CERTIFICATE, VEHICLE_IMAGE_INTERIOR, VEHICLE_IMAGE_EXTERIOR
    DECLARE @ApprovedDocCount INT;

    SELECT @ApprovedDocCount = COUNT(DISTINCT DocType)
    FROM [dbo].[VehicleDocument]
    WHERE VehicleId = @VehicleId
      AND Status = 'Accepted'
      AND DocType IN (
            'VEHICLE_REGISTRATION',
            'MOT_CERTIFICATE',
            'VEHICLE_CLASSIFICATION_CERTIFICATE',
            'VEHICLE_IMAGE_INTERIOR',
            'VEHICLE_IMAGE_EXTERIOR'
      );

    IF @ApprovedDocCount = @RequiredDocCount
    BEGIN
        -- All required docs are accepted -> verify vehicle (same spirit as user verification)
        UPDATE [dbo].[Vehicle]
        SET
            Verified = 1,
            Status   = 'Active'
        WHERE VehicleId = @VehicleId;

        PRINT('Vehicle verified successfully.');
    END;
END;
GO
