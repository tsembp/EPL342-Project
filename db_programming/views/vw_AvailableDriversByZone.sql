-- =============================================
-- View: vw_AvailableDriversByZone
-- Description: Real-time view of available drivers per zone with their service capabilities
-- =============================================
IF OBJECT_ID('dbo.vw_AvailableDriversByZone', 'V') IS NOT NULL
    DROP VIEW dbo.vw_AvailableDriversByZone;
GO

CREATE VIEW dbo.vw_AvailableDriversByZone
AS
SELECT 
    -- Zone information
    gz.ZoneId,
    gz.Name AS ZoneName,
    gz.MinLat,
    gz.MinLng,
    gz.MaxLat,
    gz.MaxLng,
    
    -- Availability details
    da.AvailabilityDate,
    da.StartsAt,
    da.EndsAt,
    da.IsRecurring,
    
    -- Driver details
    da.EnrollId,
    use_enroll.UserId AS DriverUserId,
    u.FirstName AS DriverFirstName,
    u.LastName AS DriverLastName,
    u.Username AS DriverUsername,
    u.Phone AS DriverPhone,
    
    -- Vehicle details
    use_enroll.VehicleId,
    v.PlateNumber,
    v.Brand AS VehicleBrand,
    v.Model AS VehicleModel,
    v.Seats,
    v.CargoVolume,
    v.CargoWeight,
    vt.Name AS VehicleTypeName,
    
    -- Service capabilities
    st.ServiceTypeId,
    st.Name AS ServiceTypeName,
    st.BaseFare,
    st.PerKm,
    st.PerMin,
    rt.RideTypeId,
    rt.Name AS RideTypeName,
    
    -- Enrollment status
    use_enroll.Status AS EnrollmentStatus,
    use_enroll.CheckedAt AS EnrollmentCheckedAt,
    
    -- Vehicle location (if available)
    vll.Lat AS CurrentLat,
    vll.Lng AS CurrentLng,
    vll.UpdatedAt AS LocationUpdatedAt

FROM dbo.DriverAvailability da
INNER JOIN dbo.UserServiceEnrollment use_enroll ON da.EnrollId = use_enroll.EnrollId
INNER JOIN dbo.[User] u ON use_enroll.UserId = u.UserId
INNER JOIN dbo.Vehicle v ON use_enroll.VehicleId = v.VehicleId
INNER JOIN dbo.VehicleType vt ON v.VehicleTypeId = vt.VehicleTypeId
INNER JOIN dbo.Geofencezone gz ON da.GeofencezoneId = gz.ZoneId
INNER JOIN dbo.Servicetype st ON use_enroll.ServiceType = st.ServiceTypeId
INNER JOIN dbo.Ridetype rt ON use_enroll.RideType = rt.RideTypeId
LEFT JOIN dbo.VehicleLocationLive vll ON v.VehicleId = vll.VehicleId

WHERE 
    use_enroll.Status = 'Approved'
    AND v.Status = 'Active'
    AND v.Verified = 1
    AND st.Active = 1;
GO

PRINT 'View vw_AvailableDriversByZone created successfully.';
GO
