CREATE OR ALTER PROCEDURE dbo.usp_Admin_Login
    @Email          NVARCHAR(MAX),
    @PasswordPlain  NVARCHAR(4000)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @HashedPassword VARCHAR(64);

    SET @HashedPassword = dbo.fn_HashPassword(@PasswordPlain);

    IF EXISTS (
        SELECT 1
        FROM dbo.Admin
        WHERE Email = @Email
          AND PasswordHash = @HashedPassword
    )
    BEGIN
        SELECT 
            AdminID AS user_id,
            'A' AS role,
            'STAFF' AS account_type,
            Username AS username,
            'VERIFIED' AS verification_status
        FROM dbo.Admin
        WHERE Email = @Email
          AND PasswordHash = @HashedPassword;
        
    END
    ELSE
    BEGIN
        SELECT 'Invalid email or password' AS Status;
    END
END;


GO


CREATE OR ALTER PROCEDURE dbo.usp_Admin_Signup
    @Email          NVARCHAR(255),
    @Username       NVARCHAR(30),
    @PasswordPlain  NVARCHAR(4000)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM dbo.Admin WHERE Email = @Email)
    BEGIN
        RAISERROR('Email already in use', 16, 1);
        RETURN;
    END

    DECLARE @HashedPassword VARCHAR(64);

    SET @HashedPassword = dbo.fn_HashPassword(@PasswordPlain);

    INSERT INTO dbo.Admin (Email, Username, PasswordHash)
    VALUES (@Email, @Username, @HashedPassword);
END;