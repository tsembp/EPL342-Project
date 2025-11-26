--  STEP 1: Get all person documents with pending status
CREATE OR ALTER PROCEDURE [dbo].[usp_GetPendingPersonDocumentsForReview]
(
    @OperatorId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Make sure operator exists and is verified
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

    SELECT
        PD.DocId,
        PD.UserId,
        U.Username,
        U.Email,
        U.Role,
        PD.DocType,
        PD.DocNo,
        PD.FileUrl,
        PD.IssueDate,
        PD.ExpiryDate,
        PD.UploadedAt,
        PD.Status
    FROM [dbo].[PersonDocument] PD
    INNER JOIN [dbo].[User] U
        ON U.UserId = PD.UserId
    WHERE PD.Status = 'Pending'
      AND U.Role IN ('D','C')
    ORDER BY PD.UploadedAt;
END;
GO

CREATE OR ALTER PROCEDURE [dbo].[usp_ReviewPersonDocument]
(
    @OperatorId UNIQUEIDENTIFIER,
    @DocId INT,
    @NewStatus NVARCHAR(20), -- 'Accepted', 'Rejected'
    @ReviewComment NVARCHAR(1000) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

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

    DECLARE
        @UserId UNIQUEIDENTIFIER,
        @UserRole CHAR(1),
        @DocType NVARCHAR(100);

    SELECT
        @UserId = PD.UserId,
        @DocType = PD.DocType,
        @UserRole = U.Role
    FROM [dbo].[PersonDocument] PD
    INNER JOIN [dbo].[User] U
        ON U.UserId = PD.UserId
    WHERE PD.DocId = @DocId;

    IF @UserId IS NULL
    BEGIN
        RAISERROR('Document not found.', 16, 1);
        RETURN;
    END;

    -- Update review info on the document
    UPDATE [dbo].[PersonDocument]
    SET
        Status               = @NewStatus,
        ReviewedByOperatorId = @OperatorId,
        ReviewedAt           = SYSUTCDATETIME(),
        ReviewComments       = @ReviewComment
    WHERE DocId = @DocId;

    -- If rejected, just stop here.
    IF @NewStatus = 'Rejected'
    BEGIN
        RETURN;
    END;

    -- Only auto-verify Drivers, Company Reps, Passengers
    IF @UserRole NOT IN ('D', 'C', 'P')
    BEGIN
        RETURN;
    END;

    -- Check if user has all required document types approved
    DECLARE @RequiredDocCountForDriver INT = 8;
    DECLARE @RequiredDocCountForPassenger INT = 4;
    DECLARE @ApprovedDocCount INT;

    SELECT @ApprovedDocCount = COUNT(DISTINCT DocType)
    FROM [dbo].[PersonDocument]
    WHERE UserId = @UserId
      AND Status = 'Accepted'
      AND DocType IN (
            'ID_OR_PASSPORT',
            'RESIDENCE_PERMIT',
            'DRIVING_LICENSE',
            'VEHICLE_REG',
            'MOT_CERT',
            'CRIMINAL_RECORD',
            'MEDICAL_CERT',
            'PSYCHOLOGICAL_CERT'
      );

    IF @ApprovedDocCount = @RequiredDocCountForDriver
       AND @UserRole IN ('D','C')
    BEGIN
        UPDATE [dbo].[User]
        SET Verified = 1
        WHERE UserId = @UserId;
        PRINT('Driver/CR verified successfully.');
        RETURN;
    END;

    IF @ApprovedDocCount = @RequiredDocCountForPassenger
       AND @UserRole = 'P'
    BEGIN
        UPDATE [dbo].[Passenger]
        SET CanDrive = 1
        WHERE UserId = @UserId;
        PRINT('Passenger can now drive.');
        RETURN;
    END;
END;
GO


