CREATE OR ALTER PROCEDURE dbo.usp_UpdateDriverPhoto
(
    @UserId   UNIQUEIDENTIFIER,
    @PhotoUrl NVARCHAR(MAX)
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate that the user exists and is a Driver
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.[User] U
        WHERE U.UserId = @UserId
          AND U.Role = 'D'
    )
    BEGIN
        RAISERROR('User does not exist or is not a Driver.', 16, 1);
        RETURN;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Driver D
        WHERE D.UserId = @UserId
    )
    BEGIN
        RAISERROR('Driver record not found for this user.', 16, 1);
        RETURN;
    END;

    IF @PhotoUrl IS NULL OR LTRIM(RTRIM(@PhotoUrl)) = ''
    BEGIN
        RAISERROR('PhotoUrl cannot be empty.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        UPDATE dbo.Driver
        SET PhotoUrl = @PhotoUrl
        WHERE UserId = @UserId;

        SELECT @PhotoUrl AS PhotoUrl;
    END TRY
    BEGIN CATCH
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSev INT = ERROR_SEVERITY();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, @ErrSev, @ErrState);
    END CATCH;
END;
GO
