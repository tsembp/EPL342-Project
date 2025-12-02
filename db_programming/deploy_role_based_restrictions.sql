-- =============================================
-- Script to deploy role-based vehicle type restrictions
-- Run this script to create the stored procedures
-- =============================================

USE [sgavri03]; -- Replace with your actual database name
GO

PRINT 'Deploying role-based vehicle type restriction stored procedures...';
GO

-- 1. Create the role-based ride profiles retrieval procedure
PRINT 'Creating usp_GetAllowedRideProfilesByRole...';
GO

EXEC('
CREATE OR ALTER PROCEDURE dbo.usp_GetAllowedRideProfilesByRole
    @UserRole CHAR(1)
AS
BEGIN
    SET NOCOUNT ON;

    -- Company Representatives: only teledriving and fully_autonomous
    IF @UserRole = ''C''
    BEGIN
        SELECT
            ARP.RideProfileId,
            ARP.ServiceTypeId,
            ST.Name AS ServiceTypeName,
            ARP.RideTypeId,
            RT.Name AS RideTypeName,
            ARP.VehicleTypeId,
            VT.Name AS VehicleTypeName,
            ARP.ProfileName
        FROM dbo.AllowedRideProfile AS ARP
        JOIN dbo.ServiceType AS ST
            ON ST.ServiceTypeId = ARP.ServiceTypeId
        JOIN dbo.RideType AS RT
            ON RT.RideTypeId = ARP.RideTypeId
        JOIN dbo.VehicleType AS VT
            ON VT.VehicleTypeId = ARP.VehicleTypeId
        WHERE RT.Name IN (''teledriving'', ''fully_autonomous'')
        ORDER BY ST.Name, RT.Name, VT.Name;
    END
    -- Drivers: all except teledriving and fully_autonomous
    ELSE IF @UserRole = ''D''
    BEGIN
        SELECT
            ARP.RideProfileId,
            ARP.ServiceTypeId,
            ST.Name AS ServiceTypeName,
            ARP.RideTypeId,
            RT.Name AS RideTypeName,
            ARP.VehicleTypeId,
            VT.Name AS VehicleTypeName,
            ARP.ProfileName
        FROM dbo.AllowedRideProfile AS ARP
        JOIN dbo.ServiceType AS ST
            ON ST.ServiceTypeId = ARP.ServiceTypeId
        JOIN dbo.RideType AS RT
            ON RT.RideTypeId = ARP.RideTypeId
        JOIN dbo.VehicleType AS VT
            ON VT.VehicleTypeId = ARP.VehicleTypeId
        WHERE RT.Name NOT IN (''teledriving'', ''fully_autonomous'')
        ORDER BY ST.Name, RT.Name, VT.Name;
    END
    ELSE
    BEGIN
        -- Invalid role, return empty result
        SELECT
            ARP.RideProfileId,
            ARP.ServiceTypeId,
            ST.Name AS ServiceTypeName,
            ARP.RideTypeId,
            RT.Name AS RideTypeName,
            ARP.VehicleTypeId,
            VT.Name AS VehicleTypeName,
            ARP.ProfileName
        FROM dbo.AllowedRideProfile AS ARP
        JOIN dbo.ServiceType AS ST
            ON ST.ServiceTypeId = ARP.ServiceTypeId
        JOIN dbo.RideType AS RT
            ON RT.RideTypeId = ARP.RideTypeId
        JOIN dbo.VehicleType AS VT
            ON VT.VehicleTypeId = ARP.VehicleTypeId
        WHERE 1 = 0; -- Return no rows
    END
END;
');
GO

PRINT '✓ usp_GetAllowedRideProfilesByRole created successfully';
GO

-- 2. Create validation procedure for vehicle enrollment
PRINT 'Creating usp_ValidateVehicleRideTypeForRole...';
GO

EXEC('
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
    IF @UserRole = ''C''
    BEGIN
        -- Company Representatives: only teledriving and fully_autonomous
        IF @RideTypeName IN (''teledriving'', ''fully_autonomous'')
            SET @IsValid = 1;
        ELSE
            SET @IsValid = 0;
    END
    ELSE IF @UserRole = ''D''
    BEGIN
        -- Drivers: all except teledriving and fully_autonomous
        IF @RideTypeName NOT IN (''teledriving'', ''fully_autonomous'')
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
');
GO

PRINT '✓ usp_ValidateVehicleRideTypeForRole created successfully';
GO

-- 3. Test the procedures
PRINT '';
PRINT 'Testing procedures...';
PRINT '---------------------';
GO

-- Test for Driver (D) - should exclude teledriving and fully_autonomous
PRINT 'Testing with Driver role (D):';
EXEC dbo.usp_GetAllowedRideProfilesByRole @UserRole = 'D';
GO

PRINT '';
PRINT 'Testing with Company Representative role (C):';
-- Test for Company Representative (C) - should only show teledriving and fully_autonomous
EXEC dbo.usp_GetAllowedRideProfilesByRole @UserRole = 'C';
GO

PRINT '';
PRINT '=============================================';
PRINT 'Deployment completed successfully!';
PRINT '=============================================';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Restart your Flask backend server';
PRINT '2. Restart your frontend dev server';
PRINT '3. Test by logging in as a Company Representative';
PRINT '4. Navigate to Driver Dashboard > Services tab';
PRINT '5. Verify that only teledriving/autonomous profiles appear';
PRINT '';
GO
