CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_SubmitRequest
(
    @UserId UNIQUEIDENTIFIER,
    @RequestType NVARCHAR(500) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- User must exist & be verified
    IF NOT EXISTS (SELECT 1 FROM [dbo].[User] WHERE UserId = @UserId AND Verified=1)
    BEGIN
        RAISERROR('User must exist and be validated.', 16, 1);
        RETURN;
    END;

    -- Validate request type
    IF @RequestType IS NOT NULL AND @RequestType NOT IN ('DataAccess','DataDeletion','DataExport', 'DataCorrection')
    BEGIN
        RAISERROR('Invalid GDPR request type.', 16, 1);
        RETURN;
    END;

    DECLARE @RequestId INT;

    INSERT INTO dbo.GdprRequest (UserId, [Type], [Status], RequestedAt)
    VALUES (@UserId, @RequestType, 'Pending', GETDATE());
    
    SET @RequestId = SCOPE_IDENTITY();

    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (@RequestId, NULL, GETDATE(), N'GDPR request submitted');

    SELECT @RequestId AS GdprRequestId;
END;
