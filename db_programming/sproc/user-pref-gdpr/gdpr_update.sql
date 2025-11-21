CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_UpdateStatus
(
    @GdprId        INT,
    @NewStatus     NVARCHAR(100),
    @ActorAdminId   UNIQUEIDENTIFIER,
    @ActorNote          NVARCHAR(MAX) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate status
    IF @NewStatus NOT IN ('Pending','Under-Review','Pre-Approved','Approved','Denied','Completed')
    BEGIN
        RAISERROR('Invalid GDPR status.', 16, 1);
        RETURN;
    END;

    -- Validate request exists
    IF NOT EXISTS (SELECT 1 FROM dbo.GdprRequest WHERE GdprId = @GdprId)
    BEGIN
        RAISERROR('GDPR request does not exist.', 16, 1);
        RETURN;
    END;

    -- Validate actor exists (operator or admin)
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Admin WHERE AdminId = @ActorAdminId
        UNION
        SELECT 1 FROM dbo.Operator WHERE OperatorId = @ActorAdminId
    )
    BEGIN
        RAISERROR('Actor user does not exist. Must be Operator or Admin.', 16, 1);
        RETURN;
    END;

    -- Update status
    UPDATE dbo.GdprRequest
    SET Status = @NewStatus,
        DecidedAt = CASE WHEN @NewStatus <> 'Pending' THEN GETDATE() ELSE DecidedAt END
    WHERE GdprId = @GdprId;

    DECLARE @Note NVARCHAR(MAX)
    SET @Note = 'Status changed to: ' + @NewStatus + ' | Note from actor: ' + ISNULL(@ActorNote, 'N/A');

    -- Insert log entry
    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (@GdprId, @ActorAdminId, GETDATE(), @Note);
END;
