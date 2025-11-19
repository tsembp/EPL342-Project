CREATE OR ALTER PROCEDURE dbo.usp_Login
(
    @InputEmail     NVARCHAR(256),     -- Email
    @PasswordPlain  NVARCHAR(4000)
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Hash the incoming password using the same function used at signup
    DECLARE @PasswordHashInput NVARCHAR(MAX) =
        dbo.fn_HashPassword(@PasswordPlain);

    DECLARE
        @UserId             UNIQUEIDENTIFIER,
        @Email              NVARCHAR(MAX),
        @PasswordHashStored NVARCHAR(MAX),
        @Role               CHAR(1),
        @Verified           BIT,
        @AccountType        NVARCHAR(20);

    -- 1. Find account by email from the unified view
    SELECT TOP (1)
        @UserId             = A.UserId,
        @Email              = A.Email,
        @PasswordHashStored = A.PasswordHash,
        @Role               = A.Role,
        @Verified           = A.Verified,
        @AccountType        = A.AccountType
    FROM dbo.vAllAccounts AS A
    WHERE A.Email = @InputEmail;

    -- If no such account
    IF @UserId IS NULL
    BEGIN
        RAISERROR('Invalid credentials.', 16, 1);
        RETURN;
    END;

    -- 2. Check password
    IF @PasswordHashStored <> @PasswordHashInput
    BEGIN
        RAISERROR('Invalid credentials.', 16, 1);
        RETURN;
    END;

    -- 3. Check verification / activation
    -- For USERS (P/D/C) and OPERATORS (O), Verified must be 1.
    -- For INSPECTORS (I), Verified is NULL in the view and we allow login.
    IF @Role <> 'I' AND ISNULL(@Verified, 0) = 0
    BEGIN
        RAISERROR('Account is not verified.', 16, 1);
        RETURN;
    END;

    -- 4. Success: return minimal info for the PHP app
    SELECT
        @UserId     AS UserId,
        @Role       AS Role,
        @AccountType AS AccountType,
        @Email      AS Email
END;
GO
