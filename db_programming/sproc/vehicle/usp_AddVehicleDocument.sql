CREATE OR ALTER PROCEDURE dbo.usp_AddVehicleDocument
(
    @VehicleId  UNIQUEIDENTIFIER,
    @DocType    NVARCHAR(100),
    @DocNo      NVARCHAR(100) = NULL, -- User-provided DocNo
    @IssueDate  DATETIME2 = NULL,
    @ExpiryDate DATETIME2 = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate vehicle exists
    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[Vehicle] V
        WHERE V.VehicleId = @VehicleId
    )
    BEGIN
        RAISERROR('Vehicle does not exist.', 16, 1);
        RETURN;
    END;

    -- Validate DocType (must match CHECK constraint)
    IF @DocType NOT IN (
        'VEHICLE_REGISTRATION',
        'MOT_CERTIFICATE',
        'VEHICLE_CLASSIFICATION_CERTIFICATE',
        'VEHICLE_IMAGE'
    )
    BEGIN
        RAISERROR('Invalid vehicle DocType.', 16, 1);
        RETURN;
    END;

    -- Validate dates
    IF @IssueDate IS NOT NULL AND @IssueDate > GETUTCDATE()
    BEGIN
        RAISERROR('IssueDate cannot be in the future.', 16, 1);
        RETURN;
    END;

    IF @ExpiryDate IS NOT NULL AND @IssueDate IS NOT NULL
       AND @ExpiryDate <= @IssueDate
    BEGIN
        RAISERROR('ExpiryDate must be NULL or later than IssueDate.', 16, 1);
        RETURN;
    END;

    -- Prevent duplicate active docs of same type for the same vehicle
    -- (allow re-uploads only after previous one is Rejected)
    IF EXISTS (
        SELECT 1
        FROM [dbo].[VehicleDocument] VD
        WHERE VD.VehicleId = @VehicleId
          AND VD.DocType   = @DocType
          AND VD.Status IN ('Pending', 'Accepted')
    )
    BEGIN
        RAISERROR('Vehicle already has a Pending or Accepted document of this type.', 16, 1);
        RETURN;
    END;

    -- Insert document
    BEGIN TRY
        INSERT INTO [dbo].[VehicleDocument]
        (
            VehicleId,
            DocNo, -- Use provided DocNo
            DocType,
            IssueDate,
            ExpiryDate,
            UploadedAt,
            FileUrl,
            Accepted,
            Status,
            ReviewedByOperatorId,
            ReviewedAt,
            ReviewComments
        )
        VALUES
        (
            @VehicleId,
            @DocNo, -- Use @DocNo parameter
            @DocType,
            @IssueDate,
            @ExpiryDate,
            SYSUTCDATETIME(),
            'https://storage-bucket.com/vehicle-documents/'
                + CAST(@VehicleId AS NVARCHAR(36))
                + '/' + @DocType + '.pdf',  -- dummy URL
            0,              -- Accepted
            'Pending',      -- Status
            NULL,           -- ReviewedByOperatorId
            NULL,           -- ReviewedAt
            NULL            -- ReviewComments
        );
        SELECT SCOPE_IDENTITY() AS VehDocId;
    END TRY
    BEGIN CATCH
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSev INT = ERROR_SEVERITY();
        DECLARE @ErrState INT = ERROR_STATE();

        RAISERROR(@ErrMsg, @ErrSev, @ErrState);
    END CATCH;
END;
GO
