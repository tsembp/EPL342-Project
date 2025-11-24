CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_UpdateStatus
(
    @GdprId        INT,
    @NewStatus     NVARCHAR(100),
    @ActorAdminId  UNIQUEIDENTIFIER = NULL,
    @ActorNote     NVARCHAR(MAX) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Direct status update, no validation
    UPDATE dbo.GdprRequest
    SET Status    = @NewStatus,
        DecidedAt = CASE 
                        WHEN @NewStatus <> 'Pending' THEN GETUTCDATE() 
                        ELSE DecidedAt 
                    END
    WHERE GdprId = @GdprId;

    DECLARE @Note NVARCHAR(MAX);
    SET @Note = 'Status changed to: ' + ISNULL(@NewStatus, 'NULL')
                + ' | Note from actor: ' + ISNULL(@ActorNote, 'N/A');

    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (@GdprId, @ActorAdminId, GETUTCDATE(), @Note);
END;
GO
