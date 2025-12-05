CREATE OR ALTER VIEW dbo.vw_AllowedRideProfiles
AS
SELECT 
    arp.RideProfileId,
    st.ServiceTypeId,
    st.Name AS ServiceTypeName,
    rt.RideTypeId,
    rt.Name AS RideTypeName,
    vt.VehicleTypeId,
    vt.Name AS VehicleTypeName,
    vt.NumOfSeats
FROM dbo.AllowedRideProfile arp
JOIN dbo.Servicetype st ON arp.ServiceTypeId = st.ServiceTypeId
JOIN dbo.Ridetype rt ON arp.RideTypeId = rt.RideTypeId
JOIN dbo.VehicleType vt ON arp.VehicleTypeId = vt.VehicleTypeId;
