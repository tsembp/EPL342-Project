CREATE OR ALTER PROCEDURE dbo.usp_UpdateDriverPhoto
(
    @UserId   UNIQUEIDENTIFIER,
    @PhotoUrl NVARCHAR(MAX)
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Role NVARCHAR(1);
    SELECT @Role = [Role] FROM dbo.[User] WHERE UserId = @UserId;

    -- Validate that the user exists and is a Driver/CR
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.[User] U
        WHERE U.UserId = @UserId
          AND U.Role = @Role
    )
    BEGIN
        RAISERROR('User does not exist or is not a Driver/CR.', 16, 1);
        RETURN;
    END;

    IF @PhotoUrl IS NULL OR LTRIM(RTRIM(@PhotoUrl)) = ''
    BEGIN
        RAISERROR('PhotoUrl cannot be empty.', 16, 1);
        RETURN;
    END;

    BEGIN TRY
        IF @Role = 'D'
        BEGIN
            UPDATE dbo.Driver
            SET PhotoUrl = @PhotoUrl
            WHERE UserId = @UserId;

            SELECT @PhotoUrl AS PhotoUrl;
            RETURN;
        END;
        ELSE IF @Role = 'C'
        BEGIN
            UPDATE dbo.CompanyRepresentative
            SET PhotoUrl = @PhotoUrl
            WHERE UserId = @UserId;
        END;

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
