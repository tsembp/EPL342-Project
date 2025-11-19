CREATE OR ALTER PROCEDURE dbo.usp_SignUpStaff
(
    @Role           CHAR(1),        -- 'O' : Operator, 'I': Inspector
    @Email          NVARCHAR(MAX),
    @Username       NVARCHAR(30),
    @PasswordPlain  NVARCHAR(4000)
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Input validation
    IF @Role NOT IN ('O','I')
    BEGIN
        RAISERROR('Invalid Role. Must be O or I.', 16, 1);
        RETURN;
    END;

    -- Uniqueness check
    IF EXISTS (SELECT 1 FROM [dbo].[Operator] WHERE Email = @Email)
    OR EXISTS (SELECT 1 FROM [dbo].[Inspector] WHERE Email = @Email)
    BEGIN
        RAISERROR('Email already in use.', 16, 1);
        RETURN;
    END;

    IF EXISTS (SELECT 1 FROM [dbo].[Operator] WHERE Username = @Username)
    OR EXISTS (SELECT 1 FROM [dbo].[Inspector] WHERE Username = @Username)
    BEGIN
        RAISERROR('Username already in use.', 16, 1);
        RETURN;
    END;

    -- Password hash
    DECLARE @PasswordHash NVARCHAR(MAX) =
        dbo.fn_HashPassword(@PasswordPlain);

    DECLARE @UserId UNIQUEIDENTIFIER = NEWID();

    BEGIN TRY
        BEGIN TRAN;

            IF @Role = 'O'
            BEGIN
                INSERT INTO [dbo].[Operator]
                (
                    OperatorId,
                    Email,
                    Username,
                    PasswordHash,
                    CheckedByAdmin,
                    CheckedAt
                )
                VALUES
                (
                    @UserId,
                    @Email,
                    @Username,
                    @PasswordHash,
                    NULL, -- to be set when approved by an admin
                    NULL -- to be set when approved by an admin
                );
            END
            ELSE IF @Role = 'I'
            BEGIN
                INSERT INTO [dbo].[Inspector]
                (
                    InspectorId,
                    Email,
                    Username,
                    PasswordHash
                )
                VALUES
                (
                    @UserId,
                    @Email,
                    @Username,
                    @PasswordHash
                );
            END;

        COMMIT TRAN;

        -- Return created user
        SELECT 
            @UserId  AS UserId,
            @Role    AS Role,
            @Email   AS Email,
            @Username AS Username;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSev INT = ERROR_SEVERITY();
        DECLARE @ErrState INT = ERROR_STATE();

        RAISERROR(@ErrMsg, @ErrSev, @ErrState);
    END CATCH
END;
GO
