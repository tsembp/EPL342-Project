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

    DECLARE 
        @CurrentType   NVARCHAR(100),
        @CurrentStatus NVARCHAR(100);

    SELECT 
        @CurrentType   = [Type],
        @CurrentStatus = [Status]
    FROM dbo.GdprRequest
    WHERE GdprId = @GdprId;

    IF @CurrentType IS NULL
    BEGIN
        RAISERROR('GDPR request not found.', 16, 1);
        RETURN;
    END;

    IF @CurrentType <> 'DataCorrection'
    BEGIN
        RAISERROR('GDPR request is not of type DataCorrection.', 16, 1);
        RETURN;
    END;

    IF @CurrentStatus IN ('Denied','Completed')
    BEGIN
        RAISERROR('GDPR request already resolved.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.GdprRequest
    SET [Status]  = @NewStatus,
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
