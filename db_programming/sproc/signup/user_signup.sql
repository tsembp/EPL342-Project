CREATE OR ALTER PROCEDURE dbo.usp_SignUpUser
(
    @Role           CHAR(1),        -- 'P': Passenger, 'D': Driver, 'C': Company Representative
    @FirstName      NVARCHAR(50),
    @LastName       NVARCHAR(50),
    @Dob            DATE,
    @Gender         CHAR(1),        -- 'M'/'F'
    @Email          NVARCHAR(MAX),
    @Phone          NVARCHAR(32),
    @Address        NVARCHAR(MAX),
    @Username       NVARCHAR(30),
    @PasswordPlain  NVARCHAR(4000),
    @Company        NVARCHAR(100) = NULL -- Only for Company Representatives 
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Input validation
    IF @Role NOT IN ('P','D','C')
    BEGIN
        RAISERROR('Invalid Role. Must be P, D, or C.', 16, 1);
        RETURN;
    END;

    IF @Dob IS NULL OR @Dob >= CAST(GETUTCDATE() AS DATE)
    BEGIN
        RAISERROR('Invalid Date of Birth.', 16, 1);
        RETURN;
    END;

    IF @Gender NOT IN ('M','F', 'm','f')
    BEGIN
        RAISERROR('Invalid Gender. Must be M or F.', 16, 1);
        RETURN;
    END;

    -- Uniqueness check
    IF EXISTS (SELECT 1 FROM [dbo].[User] WHERE Email = @Email)
    BEGIN
        RAISERROR('Email already in use.', 16, 1);
        RETURN;
    END;

    IF EXISTS (SELECT 1 FROM [dbo].[User] WHERE Username = @Username)
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
            BEGIN
                INSERT INTO [dbo].[User]
                (
                    UserId,
                    FirstName,
                    LastName,
                    [Role],
                    Dob,
                    Gender,
                    Email,
                    Phone,
                    [Address],
                    Validated,
                    Username,
                    PasswordHash
                )
                VALUES
                (
                    @UserId,
                    @FirstName,
                    @LastName,
                    @Role,
                    @Dob,
                    @Gender,
                    @Email,
                    @Phone,
                    @Address,
                    0,
                    @Username,
                    @PasswordHash
                );

                IF @Role = 'P'
                BEGIN
                    INSERT INTO [dbo].[Passenger] (UserId)
                    VALUES (@UserId);
                END
                ELSE IF @Role = 'D'
                BEGIN
                    INSERT INTO [dbo].[Driver] (UserId)
                    VALUES (@UserId);
                END
                ELSE IF @Role = 'C'
                BEGIN
                    INSERT INTO [dbo].[CompanyRepresentative] (UserId, Company)
                    VALUES (@UserId, @Company);
                END;
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
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
        RETURN;
    END CATCH
END;
GO