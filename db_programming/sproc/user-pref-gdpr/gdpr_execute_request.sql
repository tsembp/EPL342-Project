CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ExecuteRequest
(
    @GdprId       INT,
    @ActorAdminId UNIQUEIDENTIFIER = NULL,
    @ActorNote    NVARCHAR(MAX) = NULL
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

    IF @UserId IS NULL OR @Type IS NULL
        RETURN;  -- nothing to do

    IF @Type = 'DataAccess'
    BEGIN
        EXEC dbo.usp_Gdpr_ExecuteDataAccess
             @UserId       = @UserId,
             @GdprId       = @GdprId,
             @ActorAdminId = @ActorAdminId;
    END
    ELSE IF @Type = 'DataDeletion'
    BEGIN
        EXEC dbo.usp_Gdpr_ExecuteDataDeletion
             @UserId       = @UserId,
             @GdprId       = @GdprId,
             @ActorAdminId = @ActorAdminId;
    END
    ELSE IF @Type = 'DataExport'
    BEGIN
        EXEC dbo.usp_Gdpr_ExecuteDataExport
             @UserId       = @UserId,
             @GdprId       = @GdprId,
             @ActorAdminId = @ActorAdminId;
    END
    ELSE IF @Type = 'DataCorrection'
    BEGIN
        EXEC dbo.usp_Gdpr_ExecuteDataCorrection
             @UserId       = @UserId,
             @GdprId       = @GdprId,
             @ActorAdminId = @ActorAdminId;
    END

    -- After executing action, mark as Completed and log
    EXEC dbo.usp_Gdpr_UpdateStatus
         @GdprId       = @GdprId,
         @NewStatus    = 'Completed',
         @ActorAdminId = @ActorAdminId,
         @ActorNote    = @ActorNote;
END;
GO
