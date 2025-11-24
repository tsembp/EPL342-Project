CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_SubmitRequest
(
    @UserId      UNIQUEIDENTIFIER,
    @RequestType NVARCHAR(500),
    @Reason      NVARCHAR(MAX) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Validate user exists & verified
    IF NOT EXISTS (
        SELECT 1 
        FROM dbo.[User] 
        WHERE UserId = @UserId 
          AND IsVerified = 1
    )
    BEGIN
        RAISERROR('User not found or not verified.', 16, 1);
        RETURN;
    END;

    -- 2. Validate type
    IF @RequestType NOT IN ('DataAccess','DataDeletion','DataExport','DataCorrection')
    BEGIN
        RAISERROR('Invalid GDPR request type.', 16, 1);
        RETURN;
    END;

    -- 3. Create request
    DECLARE @GdprId INT;

    INSERT INTO dbo.GdprRequest (UserId, [Type], [Status], RequestedAt, [Reason])
    VALUES (@UserId, @RequestType, 'Pending', GETUTCDATE(), @Reason);

    SET @GdprId = SCOPE_IDENTITY();

    -- 4. Execute immediately
    EXEC dbo.usp_Gdpr_ExecuteRequest
         @GdprId = @GdprId,
         @Note   = 'Auto-executed on submit';

    -- 5. Log creation
    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (
        @GdprId,
        NULL,
        GETUTCDATE(),
        'GDPR request submitted: ' + @RequestType
    );

    -- 6. Return ID
    SELECT @GdprId AS GdprRequestId;
END;
GO
