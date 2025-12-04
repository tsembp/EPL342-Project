CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ExecuteDataAccess
(
    @UserId UNIQUEIDENTIFIER,
    @GdprId INT
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AccessJson NVARCHAR(MAX);

    ---------------------------------------------------
    -- 1. Build JSON snapshot of the user's data
    ---------------------------------------------------
    SELECT @AccessJson =
    (
        SELECT
            U.UserId,
            U.Role,
            U.FirstName,
            U.LastName,
            U.Dob,
            U.Gender,
            U.Email,
            U.Phone,
            U.[Address],
            U.Username,
            U.Verified,
            U.CreatedAt

            -- If you later want to extend this (rides, payments, etc.)
            -- you can add nested JSON fields here, similar to Export.
        FROM dbo.[User] AS U
        WHERE U.UserId = @UserId
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    ---------------------------------------------------
    -- 2. Return JSON snapshot
    ---------------------------------------------------
    SELECT @AccessJson AS AccessJson;

    ---------------------------------------------------
    -- 3. Log execution
    ---------------------------------------------------
    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (
        @GdprId,
        NULL,
        GETUTCDATE(),
        N'Executed GDPR DataAccess for user ' + CONVERT(NVARCHAR(36), @UserId)
    );
END;
GO
