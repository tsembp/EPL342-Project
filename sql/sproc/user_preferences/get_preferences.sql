CREATE OR ALTER PROCEDURE dbo.usp_UserPreferences_Get
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        UserPreferencesId,
        UserId,
        NotificationsEnabled,
        LocEnabled,
        CreatedAt,
        UpdatedAt
    FROM dbo.UserPreferences
    WHERE UserId = @UserId;
END;
GO
