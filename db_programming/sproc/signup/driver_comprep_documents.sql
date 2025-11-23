CREATE OR ALTER PROCEDURE dbo.usp_AddPersonDocument
(
    @UserId     UNIQUEIDENTIFIER,
    @DocType    NVARCHAR(100),
    @DocNumber  NVARCHAR(100),
    @IssueDate  DATETIME2,
    @ExpiryDate DATETIME2 = NULL,
    @FileUrl    NVARCHAR(512)
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate user type
    IF NOT EXISTS (
        SELECT 1 FROM dbo.[User]
        WHERE UserId = @UserId
          AND Role IN ('D', 'C')
    )
    BEGIN
        RAISERROR('User does not exist or is not a Driver/Company Representative.', 16, 1);
        RETURN;
    END;

    -- Validate DocType
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
        FROM dbo.PersonDocument
        WHERE UserId = @UserId
          AND DocType = @DocType
          AND DocNo = @DocNumber
    )
    BEGIN
        RAISERROR('Document with same type+number already exists for this user.', 16, 1);
        RETURN;
    END;

    IF EXISTS (
        SELECT 1
        FROM dbo.PersonDocument
        WHERE DocNo = @DocNumber
    )
    BEGIN
        RAISERROR('Document with that number exists globally.', 16, 1);
        RETURN;
    END;

    IF EXISTS (
        SELECT 1
        FROM dbo.PersonDocument
        WHERE UserId = @UserId
          AND DocType = @DocType
          AND Status IN ('Pending', 'Accepted')
    )
    BEGIN
        RAISERROR('User already has this doc type in Pending/Accepted.', 16, 1);
        RETURN;
    END;

    IF (@FileUrl IS NULL OR LTRIM(RTRIM(@FileUrl)) = '')
    BEGIN
        RAISERROR('FileUrl cannot be empty.', 16, 1);
        RETURN;
    END;

    INSERT INTO dbo.PersonDocument (
        UserId, DocType, DocNo, IssueDate, ExpiryDate, UploadedAt, FileUrl
    )
    VALUES (
        @UserId, @DocType, @DocNumber, @IssueDate, @ExpiryDate, GETUTCDATE(), @FileUrl
    );

    SELECT SCOPE_IDENTITY() AS DocId;
END;
GO
