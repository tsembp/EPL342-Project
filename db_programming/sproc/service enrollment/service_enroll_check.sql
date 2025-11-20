CREATE OR ALTER PROCEDURE dbo.usp_UserServiceEnrollment_UpdateStatus
(
    @EnrollId     INT,
    @NewStatus    NVARCHAR(100),   -- 'Approved' or 'Rejected'
    @CheckedById  UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @NewStatus NOT IN ('Approved','Rejected')
    BEGIN
        RAISERROR('Invalid status.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.UserServiceEnrollment WHERE EnrollId = @EnrollId)
    BEGIN
        RAISERROR('Enrollment not found.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS(SELECT 1 FROM [dbo].[Operator] WHERE [OperatorId] = @CheckedById)
    BEGIN
        RAISERROR('Checking Operator not found.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.UserServiceEnrollment
    SET Status      = @NewStatus,
        CheckedAt       = GETUTCDATE(),
        CheckedById     = @CheckedById
    WHERE EnrollId = @EnrollId;
END;
