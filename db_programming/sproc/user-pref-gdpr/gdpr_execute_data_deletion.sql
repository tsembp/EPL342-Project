CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ExecuteDataDeletion
(
    @UserId       UNIQUEIDENTIFIER,
    @GdprId       INT,
    @ActorAdminId UNIQUEIDENTIFIER = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRAN;

        ------------------------------------------------
        -- 1. Anonymize core user data
        ------------------------------------------------
        UPDATE U
        SET 
            FirstName    = N'GDPR_ERASED',
            LastName     = N'GDPR_ERASED',
            -- Role stays as D/P/C (not directly identifying)
            Dob          = '1900-01-01',              -- NOT NULL, passes CHECK (in the past)
            -- Gender is NOT NULL and limited to ('m','f','M','F')
            -- => we LEAVE Gender as-is to avoid constraint violations
            Email        = N'erased_' 
                           + RIGHT(CONVERT(NVARCHAR(36), @UserId), 8) 
                           + N'@gdpr.local',          -- fake but NOT NULL and UNIQUE enough
            Phone        = N'GDPR_ERASED',            -- NOT NULL-safe (≤ 32 chars)
            [Address]    = N'GDPR_ERASED',            -- NOT NULL-safe
            Username     = N'anon_' 
                           + RIGHT(CONVERT(NVARCHAR(36), @UserId), 12),
            PasswordHash = N'GDPR_ERASED',            -- breaks login
            Verified     = 0,
            UpdatedAt    = GETUTCDATE()
        FROM dbo.[User] AS U
        WHERE U.UserId = @UserId;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN;
        THROW;
    END CATCH;

    ------------------------------------------------
    -- 2. Log execution (AFTER update succeeds)
    ------------------------------------------------
    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (
        @GdprId,
        @ActorAdminId,
        GETUTCDATE(),
        N'Executed GDPR DataDeletion for user ' + CONVERT(NVARCHAR(36), @UserId)
    );
END;
GO
