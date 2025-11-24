CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ExecuteDataExport
(
    @UserId UNIQUEIDENTIFIER,
    @GdprId INT
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ExportJson NVARCHAR(MAX);

    ---------------------------------------------------
    -- 1. Build GDPR-style JSON export for this user
    ---------------------------------------------------
    SELECT @ExportJson =
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
        FROM dbo.[User] AS U
        WHERE U.UserId = @UserId
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    ---------------------------------------------------
    -- 2. Return JSON export
    ---------------------------------------------------
    SELECT @ExportJson AS ExportJson;

    ---------------------------------------------------
    -- 3. Log execution
    ---------------------------------------------------
    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (
        @GdprId,
        NULL,
        GETUTCDATE(),
        N'Executed GDPR DataExport for user ' + CONVERT(NVARCHAR(36), @UserId)
    );
END;
GO
