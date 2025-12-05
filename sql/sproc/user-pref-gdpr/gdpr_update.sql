CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_UpdateStatus
(
    @GdprId    INT,
    @NewStatus NVARCHAR(100),
    @ActorNote NVARCHAR(MAX) = NULL         -- optional comment, but NOT linked to a user
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Direct status update
    UPDATE dbo.GdprRequest
    SET Status    = @NewStatus,
        DecidedAt = CASE 
                        WHEN @NewStatus <> 'Pending' THEN GETUTCDATE() 
                        ELSE DecidedAt 
                    END
    WHERE GdprId = @GdprId;

    DECLARE @Note NVARCHAR(MAX);
    SET @Note = 'Status changed to: ' + ISNULL(@NewStatus, 'NULL')
                + ' | System note: ' + ISNULL(@ActorNote, 'N/A');

    -- ActorAdminId is ALWAYS NULL (system action)
    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (@GdprId, NULL, GETUTCDATE(), @Note);
END;
GO
