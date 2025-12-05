CREATE OR ALTER PROCEDURE [dbo].[SetUserPreference]
    @UserId UNIQUEIDENTIFIER,
    @NotificationsEnabled BIT = 0,
    @LocEnabled BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Check if user preference already exists
        IF EXISTS (SELECT 1 FROM [dbo].[UserPreferences] WHERE [UserId] = @UserId)
        BEGIN
            -- Update existing preference
            UPDATE [dbo].[UserPreferences]
            SET 
                [NotificationsEnabled] = @NotificationsEnabled,
                [LocEnabled] = @LocEnabled,
                [UpdatedAt] = GETUTCDATE()
            WHERE [UserId] = @UserId;
        END
        ELSE
        BEGIN
            -- Insert new preference
            INSERT INTO [dbo].[UserPreferences] (
                [UserId],
                [NotificationsEnabled],
                [LocEnabled]
            )
            VALUES (
                @UserId,
                @NotificationsEnabled,
                @LocEnabled
            );
        END
        
        RETURN 0;
    END TRY
    BEGIN CATCH
        RETURN ERROR_NUMBER();
    END CATCH
END