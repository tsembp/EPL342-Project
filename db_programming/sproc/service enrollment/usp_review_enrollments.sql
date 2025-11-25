CREATE OR ALTER PROCEDURE dbo.usp_ReviewServiceEnrollment
(
    @OperatorId    UNIQUEIDENTIFIER,
    @EnrollmentId  INT,
    @NewStatus     NVARCHAR(20),
    @ReviewComment NVARCHAR(MAX) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Basic validation
    IF @NewStatus NOT IN (N'Approved', N'Rejected')
    BEGIN
        RAISERROR('Invalid status for service enrollment. Must be Approved or Rejected.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.UserServiceEnrollment
    SET 
        Status           = @NewStatus,
        CheckedById      = @OperatorId,
        ReviewedAt       = SYSUTCDATETIME(),
        ReviewComment    = @ReviewComment
    WHERE EnrollId   = @EnrollmentId;
END;
GO
