-- =============================================
-- Stored Procedure: usp_ValidateVehicleRideTypeForRole
-- Description: Validates if a user role can use specific ride types
--              when adding vehicles or enrolling in services
-- Returns: 1 if valid, 0 if invalid
-- =============================================
CREATE OR ALTER PROCEDURE dbo.usp_ValidateVehicleRideTypeForRole
    @UserId UNIQUEIDENTIFIER,
    @RideProfileId UNIQUEIDENTIFIER,
    @IsValid BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @UserRole CHAR(1);
    DECLARE @RideTypeName NVARCHAR(100);
    
    -- Get user role
    SELECT @UserRole = Role
    FROM dbo.[User]
    WHERE UserId = @UserId;
    
    -- Get ride type name from profile
    SELECT @RideTypeName = RT.Name
    FROM dbo.AllowedRideProfile ARP
    JOIN dbo.RideType RT ON RT.RideTypeId = ARP.RideTypeId
    WHERE ARP.RideProfileId = @RideProfileId;
    
    -- Validate based on role
    IF @UserRole = 'C'
    BEGIN
        -- Company Representatives: only teledriving and fully_autonomous
        IF @RideTypeName IN ('teledriving', 'fully_autonomous')
            SET @IsValid = 1;
        ELSE
            SET @IsValid = 0;
    END
    ELSE IF @UserRole = 'D'
    BEGIN
        -- Drivers: all except teledriving and fully_autonomous
        IF @RideTypeName NOT IN ('teledriving', 'fully_autonomous')
            SET @IsValid = 1;
        ELSE
            SET @IsValid = 0;
    END
    ELSE
    BEGIN
        -- Invalid role
        SET @IsValid = 0;
    END
    
    RETURN;
END;
GO
