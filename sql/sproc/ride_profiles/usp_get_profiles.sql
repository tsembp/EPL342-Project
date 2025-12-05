CREATE OR ALTER PROCEDURE dbo.usp_Operator_GetAllowedRideProfiles
AS
BEGIN
    SET NOCOUNT ON;

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
    ORDER BY ST.Name, RT.Name, VT.Name;
END;
GO
