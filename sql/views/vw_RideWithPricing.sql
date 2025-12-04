-- =============================================
-- View: vw_RideWithPricing
-- Description: Comprehensive view of rides with pricing, payment, and service details
-- =============================================
IF OBJECT_ID('dbo.vw_RideWithPricing', 'V') IS NOT NULL
    DROP VIEW dbo.vw_RideWithPricing;
GO

CREATE VIEW dbo.vw_RideWithPricing
AS
SELECT 
    -- Ride details
    r.RideId,
    r.Status AS RideStatus,
    r.StartedAt,
    r.EndedAt,
    r.DistanceKm,
    r.DurationMinutes,
    r.PriceFinal,
    
    -- Driver details
    r.DriverUserId,
    driver.FirstName AS DriverFirstName,
    driver.LastName AS DriverLastName,
    driver.Username AS DriverUsername,
    driver.Phone AS DriverPhone,
    
    -- Passenger details
    r.PassengerUserId,
    passenger.FirstName AS PassengerFirstName,
    passenger.LastName AS PassengerLastName,
    passenger.Username AS PassengerUsername,
    passenger.Phone AS PassengerPhone,
    
    -- Vehicle details
    r.VehicleId,
    v.PlateNumber,
    v.Brand AS VehicleBrand,
    v.Model AS VehicleModel,
    v.Color AS VehicleColor,
    v.Seats,
    v.PricePerKm AS VehiclePricePerKm,
    vt.Name AS VehicleTypeName,
    
    -- Service type and pricing
    st.ServiceTypeId,
    st.Name AS ServiceTypeName,
    st.BaseFare,
    rt.RideTypeId,
    rt.Name AS RideTypeName,
    
    -- Leg and zone information
    il.LegId,
    il.SeqNo AS LegSequence,
    il.ZoneId,
    gz.Name AS ZoneName,
    
    -- Pickup/Dropoff points
    pickup_point.PointId AS PickupPointId,
    pickup_point.Name AS PickupPointName,
    pickup_point.Latitude AS PickupLatitude,
    pickup_point.Longitude AS PickupLongitude,
    dropoff_point.PointId AS DropoffPointId,
    dropoff_point.Name AS DropoffPointName,
    dropoff_point.Latitude AS DropoffLatitude,
    dropoff_point.Longitude AS DropoffLongitude,
    
    -- Payment details
    p.PaymentId,
    p.GrossAmount,
    p.OsrhFee AS PlatformFee,
    p.DriverPayout,
    p.PaidAt,
    p.Method AS PaymentMethod,
    p.Status AS PaymentStatus,
    
    -- Ride request details
    rr.RequestId,
    rr.NumOfPeople,
    rr.PickupAt AS RequestedPickupTime,
    rr.CreatedAt AS RequestCreatedAt

FROM dbo.[Ride] r
INNER JOIN dbo.[User] driver ON r.DriverUserId = driver.UserId
INNER JOIN dbo.[User] passenger ON r.PassengerUserId = passenger.UserId
INNER JOIN dbo.Vehicle v ON r.VehicleId = v.VehicleId
INNER JOIN dbo.VehicleType vt ON v.VehicleTypeId = vt.VehicleTypeId
INNER JOIN dbo.DispatchOffer do_offer ON r.OfferId = do_offer.OfferId
INNER JOIN dbo.ItineraryLeg il ON do_offer.LegId = il.LegId
INNER JOIN dbo.Geofencezone gz ON il.ZoneId = gz.ZoneId
INNER JOIN dbo.RideRequest rr ON il.RideRequestId = rr.RequestId
INNER JOIN dbo.AllowedRideProfile arp ON rr.RideProfileId = arp.RideProfileId
INNER JOIN dbo.Servicetype st ON arp.ServiceTypeId = st.ServiceTypeId
INNER JOIN dbo.Ridetype rt ON arp.RideTypeId = rt.RideTypeId
LEFT JOIN dbo.Payment p ON r.Payment = p.PaymentId
LEFT JOIN dbo.ZonePoint pickup_point ON rr.PickUpPoint = pickup_point.PointId
LEFT JOIN dbo.ZonePoint dropoff_point ON rr.DropOffPoint = dropoff_point.PointId;
GO

PRINT 'View vw_RideWithPricing created successfully.';
GO
