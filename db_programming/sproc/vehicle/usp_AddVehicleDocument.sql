CREATE OR ALTER PROCEDURE dbo.usp_AddVehicleDocument
(
    @VehicleId  UNIQUEIDENTIFIER,
    @DocType    NVARCHAR(100),
    @DocNo      NVARCHAR(100) = NULL,
    @IssueDate  DATETIME2 = NULL,
    @ExpiryDate DATETIME2 = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Vehicle WHERE VehicleId = @VehicleId
    )
    BEGIN
        RAISERROR('Vehicle does not exist.', 16, 1);
        RETURN;
    END;

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

    IF @DocType = 'VEHICLE_IMAGE'
    BEGIN
        IF @DocNo IS NULL OR LTRIM(RTRIM(@DocNo)) = ''
            SET @DocNo = N'1';
    END
    ELSE
    BEGIN
        IF @DocNo IS NULL OR LTRIM(RTRIM(@DocNo)) = ''
        BEGIN
            RAISERROR('DocNo is required for this document type.', 16, 1);
            RETURN;
        END
    END;

    IF EXISTS (
        SELECT 1
        FROM dbo.VehicleDocument
        WHERE VehicleId = @VehicleId
          AND DocType = @DocType
          AND Status IN ('Pending', 'Accepted')
    )
    BEGIN
        RAISERROR('Vehicle already has a Pending or Accepted document of this type.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        INSERT INTO dbo.VehicleDocument
        (
            VehicleId,
            DocNo,
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
            @DocNo,
            @DocType,
            @IssueDate,
            @ExpiryDate,
            SYSUTCDATETIME(),
            'https://storage-bucket.com/vehicle-documents/'
                + CAST(@VehicleId AS NVARCHAR(36))
                + '/' + @DocType + '.pdf',
            0,
            'Pending',
            NULL,
            NULL,
            NULL
        );

        SELECT SCOPE_IDENTITY() AS VehDocId;
    END TRY
    BEGIN CATCH
        RAISERROR('An unexpected error occurred while uploading the document.', 16, 1);
    END CATCH;
END;
GO
