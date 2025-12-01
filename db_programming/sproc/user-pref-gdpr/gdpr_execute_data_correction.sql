CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ExecuteDataCorrection
(
    @UserId UNIQUEIDENTIFIER,
    @GdprId INT
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE 
        @Reason    NVARCHAR(MAX),
        @Type      NVARCHAR(100),
        @ReqUserId UNIQUEIDENTIFIER;

    -- Get the original request info
    SELECT 
        @Reason    = GR.[Reason],
        @Type      = GR.[Type],
        @ReqUserId = GR.UserId
    FROM dbo.GdprRequest AS GR
    WHERE GR.GdprId = @GdprId;

    -- Basic validation
    IF @ReqUserId IS NULL
    BEGIN
        RAISERROR('GDPR request not found for given GdprId.', 16, 1);
        RETURN;
    END;

    IF @ReqUserId <> @UserId
    BEGIN
        RAISERROR('GDPR request does not belong to the specified user.', 16, 1);
        RETURN;
    END;

    IF @Type <> 'DataCorrection'
    BEGIN
        RAISERROR('GDPR request type is not DataCorrection.', 16, 1);
        RETURN;
    END;

    IF @Reason IS NULL OR LTRIM(RTRIM(@Reason)) = N''
        SET @Reason = N'(no correction details provided)';

    -- Mark request as Under-Review (optional but useful)
    UPDATE dbo.GdprRequest
    SET [Status] = 'Under-Review'
    WHERE GdprId = @GdprId
      AND [Status] = 'Pending';

    ---------------------------------------------------
    -- For this project we ONLY log the requested corrections.
    ---------------------------------------------------
    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (
        @GdprId,
        NULL,
        GETUTCDATE(),
        N'Executed GDPR DataCorrection request for user ' 
        + CONVERT(NVARCHAR(36), @UserId)
        + N' | Requested corrections: ' + @Reason
    );
END;
GO
