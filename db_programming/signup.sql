CREATE OR ALTER PROCEDURE dbo.usp_SignUpUser
(
    @FirstName      NVARCHAR(50),
    @LastName       NVARCHAR(50),
    @Role           CHAR(1),        -- 'D','P','C' (Users) or 'O','I' (Staff) 
    @Dob            DATE,
    @Gender         CHAR(1),        -- 'M'/'F'
    @Email          NVARCHAR(MAX),
    @Phone          NVARCHAR(32),
    @Address        NVARCHAR(MAX),
    @Username       NVARCHAR(30),
    @PasswordPlain  NVARCHAR(4000),
    @Company        NVARCHAR(100) = NULL  -- only used if Role='C'
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Input validation
    IF @Role NOT IN ('D','P','C','O','I')
    BEGIN
        RAISERROR('Invalid Role. Must be D, P, C, O, or I.', 16, 1);
        RETURN;
    END;

    IF @Dob >= CAST(GETDATE() AS DATE)
    BEGIN
        RAISERROR('Date of birth must be in the past.', 16, 1);
        RETURN;
    END;

    IF @Gender NOT IN ('m','f','M','F')
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

        IF @Role IN ('O','I')
        BEGIN
            IF @Role = 'O'
            BEGIN
                INSERT INTO [dbo].[Operator]
                (OperatorId, Email, Username, PasswordHash, ApprovedByAdmin, ApprovedAt, CreatedAt)
                VALUES
                (@UserId, @Email, @Username, @PasswordHash, NULL, NULL, GETUTCDATE());
            END
            ELSE IF @Role = 'I'
            BEGIN
                INSERT INTO [dbo].[Inspector]
                (InspectorId, Email, Username, PasswordHash, CreatedAt)
                VALUES
                (@UserId, @Email, @Username, @PasswordHash, GETUTCDATE());
            END
        END
        
        ELSE
        BEGIN
            INSERT INTO [dbo].[User]
            (
                UserId,
                FirstName,
                LastName,
                Role,
                Dob,
                Gender,
                Email,
                Phone,
                [Address],
                Username,
                PasswordHash,
                CreatedAt,
                UpdatedAt
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
                @Username,
                @PasswordHash,
                GETUTCDATE(),
                NULL
            );

            -- Insert into subtype table based on Role
            IF @Role = 'D'
            BEGIN
                INSERT INTO [dbo].[Driver] (UserId)
                VALUES (@UserId);
            END
            ELSE IF @Role = 'P'
            BEGIN
                INSERT INTO [dbo].[Passenger] (UserId)
                VALUES (@UserId);
            END
            ELSE IF @Role = 'C'
            BEGIN
                INSERT INTO [dbo].[CompanyRepresentative] (UserId, Company)
                VALUES (@UserId, @Company);
            END

        END
        
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
