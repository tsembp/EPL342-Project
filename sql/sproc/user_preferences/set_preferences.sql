CREATE OR ALTER PROCEDURE dbo.usp_UserPreferences_Set
    @UserId UNIQUEIDENTIFIER,
    @NotificationsEnabled BIT,
    @LocEnabled BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM dbo.UserPreferences WHERE UserId = @UserId)
    BEGIN
        -- Update existing preferences
        UPDATE dbo.UserPreferences
        SET
            NotificationsEnabled = @NotificationsEnabled,
            LocEnabled           = @LocEnabled,
            UpdatedAt            = SYSUTCDATETIME()
        WHERE UserId = @UserId;
    END
    ELSE
    BEGIN
        -- Insert new preferences row
        INSERT INTO dbo.UserPreferences
            (UserId, NotificationsEnabled, LocEnabled, CreatedAt, UpdatedAt)
        VALUES
            (@UserId, @NotificationsEnabled, @LocEnabled,
             SYSUTCDATETIME(), SYSUTCDATETIME());
    END;

    -- Return final row (handy for API)
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
