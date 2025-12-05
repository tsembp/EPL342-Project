CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ExecuteRequest
(
    @GdprId       INT,
    @Note         NVARCHAR(MAX) = NULL,
    @ActorAdminId UNIQUEIDENTIFIER = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @RequestType NVARCHAR(100);
    DECLARE @UserId      UNIQUEIDENTIFIER;
    DECLARE @CurrentStatus NVARCHAR(100);

    ------------------------------------------------
    -- 1. Get request details
    ------------------------------------------------
    SELECT 
        @RequestType = [Type],
        @UserId      = UserId,
        @CurrentStatus = [Status]
    FROM dbo.GdprRequest
    WHERE GdprId = @GdprId;

    IF @RequestType IS NULL
    BEGIN
        RAISERROR('GDPR request not found.', 16, 1);
        RETURN;
    END;

    ------------------------------------------------
    -- 2. Dispatch to appropriate execution procedure
    ------------------------------------------------
    IF @RequestType = 'DataAccess'
    BEGIN
        EXEC dbo.usp_Gdpr_ExecuteDataAccess
            @UserId = @UserId,
            @GdprId = @GdprId;

        -- Update status to Completed
        UPDATE dbo.GdprRequest
        SET [Status] = 'Completed',
            DecidedAt = GETUTCDATE()
        WHERE GdprId = @GdprId;
    END
    ELSE IF @RequestType = 'DataExport'
    BEGIN
        EXEC dbo.usp_Gdpr_ExecuteDataExport
            @UserId = @UserId,
            @GdprId = @GdprId;

        -- Update status to Completed
        UPDATE dbo.GdprRequest
        SET [Status] = 'Completed',
            DecidedAt = GETUTCDATE()
        WHERE GdprId = @GdprId;
    END
    ELSE IF @RequestType = 'DataDeletion'
    BEGIN
        EXEC dbo.usp_Gdpr_ExecuteDataDeletion
            @UserId = @UserId,
            @GdprId = @GdprId,
            @ActorAdminId = @ActorAdminId;

        -- Update status to Completed
        UPDATE dbo.GdprRequest
        SET [Status] = 'Completed',
            DecidedAt = GETUTCDATE()
        WHERE GdprId = @GdprId;
    END
    ELSE IF @RequestType = 'DataCorrection'
    BEGIN
        -- DataCorrection is handled manually, just log
        INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
        VALUES (
            @GdprId,
            @ActorAdminId,
            GETUTCDATE(),
            COALESCE(@Note, N'DataCorrection request processed')
        );
    END
    ELSE
    BEGIN
        RAISERROR('Unknown GDPR request type.', 16, 1);
        RETURN;
    END;

    ------------------------------------------------
    -- 3. Additional logging if note provided
    ------------------------------------------------
    IF @Note IS NOT NULL AND @RequestType <> 'DataCorrection'
    BEGIN
        INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
        VALUES (
            @GdprId,
            @ActorAdminId,
            GETUTCDATE(),
            @Note
        );
    END;
END;
GO
