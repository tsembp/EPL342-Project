CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ExecuteRequest
(
    @GdprId INT,
    @Note   NVARCHAR(MAX) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserId UNIQUEIDENTIFIER;
    DECLARE @Type   NVARCHAR(100);

    SELECT 
        @UserId = GR.UserId,
        @Type   = GR.[Type]
    FROM dbo.GdprRequest AS GR
    WHERE GR.GdprId = @GdprId;

    IF @UserId IS NULL
    BEGIN
        RAISERROR('GDPR request not found.', 16, 1);
        RETURN;
    END;

    ---------------------------------------------------
    -- Dispatch by type (all actions are SYSTEM)
    ---------------------------------------------------
    IF @Type = 'DataAccess'
    BEGIN
        EXEC dbo.usp_Gdpr_ExecuteDataAccess
             @UserId = @UserId,
             @GdprId = @GdprId;
    END
    ELSE IF @Type = 'DataDeletion'
    BEGIN
        EXEC dbo.usp_Gdpr_ExecuteDataDeletion
             @UserId = @UserId,
             @GdprId = @GdprId;
    END
    ELSE IF @Type = 'DataExport'
    BEGIN
        EXEC dbo.usp_Gdpr_ExecuteDataExport
             @UserId = @UserId,
             @GdprId = @GdprId;
    END
    ELSE IF @Type = 'DataCorrection'
    BEGIN
        EXEC dbo.usp_Gdpr_ExecuteDataCorrection
             @UserId = @UserId,
             @GdprId = @GdprId;
    END
    ELSE
    BEGIN
        RAISERROR('Unsupported GDPR request type.', 16, 1);
        RETURN;
    END

    ---------------------------------------------------
    -- After executing action, mark as Completed
    ---------------------------------------------------
    DECLARE @ActorNoteValue NVARCHAR(MAX);
    SET @ActorNoteValue = ISNULL(@Note, 'Auto-executed GDPR request');

    EXEC dbo.usp_Gdpr_UpdateStatus
         @GdprId    = @GdprId,
         @NewStatus = 'Completed',
         @ActorNote = @ActorNoteValue;
END;
GO
