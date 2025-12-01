CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_SubmitRequest
(
    @UserId      UNIQUEIDENTIFIER,
    @RequestType NVARCHAR(100),
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
          AND Verified = 1
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

    -- 4. Execute type-specific logic
    IF @RequestType = 'DataCorrection'
    BEGIN
        -- Only log details + mark as Under-Review
        EXEC dbo.usp_Gdpr_ExecuteDataCorrection
             @UserId = @UserId,
             @GdprId = @GdprId;
    END
    ELSE
    BEGIN
        -- Access/Deletion/Export: auto execute as before
        EXEC dbo.usp_Gdpr_ExecuteRequest
             @GdprId = @GdprId,
             @Note   = 'Auto-executed on submit';
    END;

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
