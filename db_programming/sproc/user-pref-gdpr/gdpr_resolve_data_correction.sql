CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ResolveDataCorrection
(
    @GdprId        INT,
    @ActorAdminId  UNIQUEIDENTIFIER,
    @NewStatus     NVARCHAR(100),          -- 'Approved' or 'Denied' or 'Completed'
    @ActorNote     NVARCHAR(MAX) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @NewStatus NOT IN ('Approved','Denied','Completed')
    BEGIN
        RAISERROR('Invalid status for DataCorrection resolution.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.GdprRequest
    SET Status    = @NewStatus,
        DecidedAt = GETUTCDATE()
    WHERE GdprId  = @GdprId;

    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (
        @GdprId,
        @ActorAdminId,
        GETUTCDATE(),
        ISNULL(@ActorNote, N'GDPR DataCorrection request resolved.')
    );
END;
GO
