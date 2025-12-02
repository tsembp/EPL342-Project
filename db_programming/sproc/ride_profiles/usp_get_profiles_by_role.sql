-- =============================================
-- Stored Procedure: usp_GetAllowedRideProfilesByRole
-- Description: Returns ride profiles filtered by user role
--              Company Representatives (C) can only see teledriving and fully_autonomous
--              Drivers (D) can see all except teledriving and fully_autonomous
-- =============================================
CREATE OR ALTER PROCEDURE dbo.usp_GetAllowedRideProfilesByRole
    @UserRole CHAR(1)
AS
BEGIN
    SET NOCOUNT ON;

    -- Company Representatives: only teledriving and fully_autonomous
    IF @UserRole = 'C'
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
        WHERE RT.Name IN ('teledriving', 'fully_autonomous')
        ORDER BY ST.Name, RT.Name, VT.Name;
    END
    -- Drivers: all except teledriving and fully_autonomous
    ELSE IF @UserRole = 'D'
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
        WHERE RT.Name NOT IN ('teledriving', 'fully_autonomous')
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
GO
