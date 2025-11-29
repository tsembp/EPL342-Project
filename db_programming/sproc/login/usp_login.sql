CREATE OR ALTER PROCEDURE dbo.usp_Login
(
    @InputEmail     NVARCHAR(256),     -- Email
    @PasswordPlain  NVARCHAR(4000)
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;  -- Ensure errors terminate the procedure

    -- Hash the incoming password using the same function used at signup
    DECLARE @PasswordHashInput VARCHAR(64) =
        dbo.fn_HashPassword(@PasswordPlain);

    DECLARE
        @UserId             UNIQUEIDENTIFIER,
        @Email              NVARCHAR(MAX),
        @PasswordHashStored NVARCHAR(MAX),
        @Role               CHAR(1),
        @Verified           BIT,
        @AccountType        NVARCHAR(20),
        @Username           NVARCHAR(100);

    -- 1. Find account by email from the unified view
    SELECT TOP (1)
        @UserId             = A.UserId,
        @Email              = A.Email,
        @PasswordHashStored = A.PasswordHash,
        @Role               = A.Role,
        @Verified           = A.Verified,
        @AccountType        = A.AccountType,
        @Username           = A.Username
    FROM dbo.vw_AllAccounts AS A
    WHERE A.Email = @InputEmail;

    -- If no such account
    IF @UserId IS NULL
    BEGIN
        RAISERROR('Invalid credentials.', 16, 1);
        RETURN;
    END;

    -- 2. Check password - CRITICAL: Cast both to same type for comparison
    IF CAST(@PasswordHashStored AS VARCHAR(64)) <> @PasswordHashInput
    BEGIN
        RAISERROR('Invalid credentials.', 16, 1);
        RETURN;
    END;

    -- 3. Determine Verification Status
    DECLARE @VerificationStatus NVARCHAR(50);

    IF @Verified = 1
    BEGIN
        SET @VerificationStatus = 'VERIFIED';
    END
    ELSE IF @Role = 'I' -- Inspectors are always considered verified for login purposes
    BEGIN
        SET @VerificationStatus = 'VERIFIED';
    END
    ELSE IF @Role IN ('O', 'P') AND @Verified = 0
    BEGIN
        SET @VerificationStatus = 'PENDING_APPROVAL';
    END
    ELSE IF @Role IN ('D', 'C') AND @Verified = 0
    BEGIN
        DECLARE @DocumentCount INT;
        SELECT @DocumentCount = COUNT(DISTINCT PD.DocType)
        FROM dbo.PersonDocument AS PD
        WHERE PD.UserId = @UserId AND PD.Status IN ('Pending', 'Accepted');

        IF @DocumentCount < 8
        BEGIN
            SET @VerificationStatus = 'DOCS_PENDING';
        END
        ELSE
        BEGIN
            SET @VerificationStatus = 'PENDING_APPROVAL';
        END;
    END
    ELSE
    BEGIN
        -- Fallback for any other unverified role not explicitly handled,
        -- though this case should ideally not be reached with the current role definitions.
        SET @VerificationStatus = 'PENDING_APPROVAL'; 
    END;

    -- 4. Success: return minimal info and verification status
    SELECT
        @UserId     AS UserId,
        @Role       AS Role,
        @AccountType AS AccountType,
        @Email      AS Email,
        @VerificationStatus AS VerificationStatus,
        @Username   AS Username;
END;
GO
