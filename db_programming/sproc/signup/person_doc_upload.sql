CREATE OR ALTER PROCEDURE dbo.usp_AddPersonDocument
(
    @UserId     UNIQUEIDENTIFIER,
    @DocType    NVARCHAR(100),
    @DocNumber  NVARCHAR(100),
    @IssueDate  DATETIME2,
    @ExpiryDate DATETIME2 = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate user type
    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[User] U
        WHERE U.UserId = @UserId
          AND U.Role IN ('D','C','P')
    )
    BEGIN
        RAISERROR('User does not exist or is not a Driver/Company Representative.', 16, 1);
        RETURN;
    END;

    DECLARE @UserRole CHAR(1);

    SELECT @UserRole = U.Role
    FROM dbo.[User] AS U
    WHERE U.UserId = @UserId;

    -- Role-specific DocType validation
    IF @UserRole = 'P'
    BEGIN
        -- Passengers: only these 4
        IF @DocType <> 'DRIVING_LICENSE'
        BEGIN
            RAISERROR('Passengers can only upload their License.', 16, 1);
            RETURN;
        END;
    END
    ELSE
    BEGIN
        -- Drivers & Company Reps: full allowed list
        IF @DocType NOT IN (
            'ID_OR_PASSPORT',
            'RESIDENCE_PERMIT',
            'DRIVING_LICENSE',
            'VEHICLE_REG',
            'MOT_CERT',
            'CRIMINAL_RECORD',
            'MEDICAL_CERT',
            'PSYCHOLOGICAL_CERT'
        )
        BEGIN
            RAISERROR('Invalid DocType.', 16, 1);
            RETURN;
        END; 
    END;

    -- Validate dates
    IF @IssueDate > GETUTCDATE()
    BEGIN
        RAISERROR('IssueDate cannot be in the future.', 16, 1);
        RETURN;
    END;

    IF @ExpiryDate IS NOT NULL AND @ExpiryDate <= @IssueDate
    BEGIN
        RAISERROR('ExpiryDate must be NULL or later than IssueDate.', 16, 1);
        RETURN;
    END;

    -- Validate uniqueness
    IF EXISTS (
        SELECT 1
        FROM [dbo].[PersonDocument] PD
        WHERE PD.UserId = @UserId
          AND PD.DocType = @DocType
          AND PD.DocNo = @DocNumber
    )
    BEGIN
        RAISERROR('Document with the same type and number already exists for this user.', 16, 1);
        RETURN;
    END;

    IF EXISTS(
        SELECT 1
        FROM [dbo].[PersonDocument] PD
        WHERE PD.UserId = @UserId
          AND PD.DocType = @DocType
          AND PD.Status IN ('Pending', 'Accepted')
    )
    BEGIN
        RAISERROR('Document with the same type and status in (Pending, Accepted) already exists for this user.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        INSERT INTO [dbo].[PersonDocument]
        (
            UserId,
            DocType,
            DocNo,
            IssueDate,
            ExpiryDate,
            UploadedAt,
            FileUrl
        )
        VALUES
        (
            @UserId,
            @DocType,
            @DocNumber,
            @IssueDate,
            @ExpiryDate,
            GETUTCDATE(),
            'https://storage-bucket.com/documents/' + CAST(@UserId AS NVARCHAR(36)) + '/' + @DocType + '_' + @DocNumber + '.pdf' -- dummy URL
        );

        -- Return the created doc
        SELECT SCOPE_IDENTITY() AS DocId;
    END TRY
    BEGIN CATCH
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSev INT = ERROR_SEVERITY();
        DECLARE @ErrState INT = ERROR_STATE();

        RAISERROR(@ErrMsg, @ErrSev, @ErrState);
    END CATCH;
END;
GO
