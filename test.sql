-- =====================================================
-- 1. BRIDGED ROUTES VALIDATION
-- =====================================================

-- Check: Only bridged_route service types should have multi-leg itineraries
SELECT 
    rr.RequestId,
    st.Name AS ServiceType,
    COUNT(il.LegId) AS NumLegs,
    COUNT(DISTINCT lcb.Bridge) AS NumBridgesCrossed,
    CASE 
        WHEN st.Name = 'bridged_route' AND COUNT(il.LegId) > 1 THEN '✅ Valid'
        WHEN st.Name = 'bridged_route' AND COUNT(il.LegId) = 1 THEN '❌ Bridged route with single leg'
        WHEN st.Name != 'bridged_route' AND COUNT(il.LegId) > 1 THEN '❌ Non-bridged route with multiple legs'
        WHEN st.Name != 'bridged_route' AND COUNT(il.LegId) = 1 THEN '✅ Valid'
        ELSE '⚠️  Unknown case'
    END AS ValidationStatus
FROM [dbo].[RideRequest] rr
JOIN [dbo].[AllowedRideProfile] arp ON rr.RideProfileId = arp.RideProfileId
JOIN [dbo].[Servicetype] st ON arp.ServiceTypeId = st.ServiceTypeId
LEFT JOIN [dbo].[ItineraryLeg] il ON rr.RequestId = il.RideRequestId
LEFT JOIN [dbo].[LegCrossesBridge] lcb ON il.LegId = lcb.ItineraryLeg
GROUP BY rr.RequestId, st.Name
ORDER BY 
    CASE 
        WHEN st.Name = 'bridged_route' AND COUNT(il.LegId) > 1 THEN 1
        WHEN st.Name != 'bridged_route' AND COUNT(il.LegId) = 1 THEN 1
        ELSE 0
    END,
    COUNT(il.LegId) DESC;


-- =====================================================
-- 2. LEG CROSSES BRIDGE VALIDATION
-- =====================================================

-- Check: Every leg with ViaBridgeId must have entry in LegCrossesBridge
SELECT * FROM (
    SELECT 
        il.LegId,
        il.SeqNo,
        il.ViaBridgeId,
        il.RideRequestId,
        lcb.Bridge AS LegCrossesBridgeEntry,
        CASE 
            WHEN il.ViaBridgeId IS NOT NULL AND lcb.Bridge IS NOT NULL THEN '✅ Valid'
            WHEN il.ViaBridgeId IS NOT NULL AND lcb.Bridge IS NULL THEN '❌ Missing LegCrossesBridge entry'
            WHEN il.ViaBridgeId IS NULL AND lcb.Bridge IS NOT NULL THEN '❌ LegCrossesBridge without ViaBridgeId'
            ELSE '✅ Valid (no bridge)'
        END AS ValidationStatus
    FROM [dbo].[ItineraryLeg] il
    LEFT JOIN [dbo].[LegCrossesBridge] lcb ON il.LegId = lcb.ItineraryLeg
) AS ValidationResults
WHERE ValidationStatus LIKE '❌%'
ORDER BY ValidationStatus, RideRequestId, SeqNo;


-- =====================================================
-- 3. BRIDGE CONNECTIVITY VALIDATION
-- =====================================================

-- Check: All bridges in LegCrossesBridge reference valid bridges
SELECT 
    lcb.ItineraryLeg,
    lcb.Bridge,
    b.BridgeId,
    b.Name AS BridgeName,
    b.FromZone,
    b.ToZone,
    CASE 
        WHEN b.BridgeId IS NOT NULL THEN '✅ Valid'
        ELSE '❌ Invalid bridge reference'
    END AS ValidationStatus
FROM [dbo].[LegCrossesBridge] lcb
LEFT JOIN [dbo].[Bridge] b ON lcb.Bridge = b.BridgeId
WHERE b.BridgeId IS NULL;


-- =====================================================
-- 4. MULTI-LEG SEQUENCE VALIDATION
-- =====================================================

-- Check: Multi-leg itineraries have sequential SeqNo without gaps
WITH LegSequences AS (
    SELECT 
        RideRequestId,
        COUNT(*) AS TotalLegs,
        MAX(SeqNo) AS MaxSeqNo,
        MIN(SeqNo) AS MinSeqNo,
        STRING_AGG(CAST(SeqNo AS VARCHAR), ', ') WITHIN GROUP (ORDER BY SeqNo) AS SeqNumbers
    FROM [dbo].[ItineraryLeg]
    GROUP BY RideRequestId
    HAVING COUNT(*) > 1
)
SELECT 
    RideRequestId,
    TotalLegs,
    MaxSeqNo,
    MinSeqNo,
    SeqNumbers,
    CASE 
        WHEN TotalLegs = MaxSeqNo AND MinSeqNo = 1 THEN '✅ Valid sequence'
        ELSE '❌ Missing or duplicate sequence numbers'
    END AS ValidationStatus
FROM LegSequences
WHERE TotalLegs != MaxSeqNo OR MinSeqNo != 1
ORDER BY RideRequestId;


-- =====================================================
-- 5. ZONE COORDINATES VALIDATION
-- =====================================================

-- Check: All zones have valid coordinates (MaxLat > MinLat, MaxLng > MinLng)
SELECT 
    ZoneId,
    Name,
    MinLat,
    MaxLat,
    MinLng,
    MaxLng,
    CASE 
        WHEN MaxLat > MinLat AND MaxLng > MinLng THEN '✅ Valid'
        ELSE '❌ Invalid coordinates'
    END AS ValidationStatus
FROM [dbo].[Geofencezone]
WHERE MaxLat <= MinLat OR MaxLng <= MinLng;


-- =====================================================
-- 6. BRIDGE ZONE REFERENCES VALIDATION
-- =====================================================

-- Check: All bridges reference valid zones
SELECT 
    b.BridgeId,
    b.Name,
    b.FromZone,
    b.ToZone,
    z1.ZoneId AS FromZoneExists,
    z2.ZoneId AS ToZoneExists,
    CASE 
        WHEN z1.ZoneId IS NOT NULL AND z2.ZoneId IS NOT NULL THEN '✅ Valid'
        WHEN z1.ZoneId IS NULL THEN '❌ FromZone does not exist'
        WHEN z2.ZoneId IS NULL THEN '❌ ToZone does not exist'
        ELSE '❌ Unknown issue'
    END AS ValidationStatus
FROM [dbo].[Bridge] b
LEFT JOIN [dbo].[Geofencezone] z1 ON b.FromZone = z1.ZoneId
LEFT JOIN [dbo].[Geofencezone] z2 ON b.ToZone = z2.ZoneId
WHERE z1.ZoneId IS NULL OR z2.ZoneId IS NULL;


-- =====================================================
-- 7. PAYMENT VALIDATION
-- =====================================================

-- Check: All completed rides have payments
SELECT * FROM (
    SELECT 
        r.RideId,
        r.Status,
        r.PriceFinal,
        r.Payment,
        p.PaymentId,
        p.GrossAmount,
        p.Status AS PaymentStatus,
        CASE 
            WHEN r.Status = 'Completed' AND p.PaymentId IS NOT NULL THEN '✅ Valid'
            WHEN r.Status = 'Completed' AND p.PaymentId IS NULL THEN '❌ Completed ride without payment'
            WHEN r.Status != 'Completed' AND p.PaymentId IS NOT NULL THEN '⚠️  Non-completed ride has payment'
            ELSE '✅ Valid (no payment needed)'
        END AS ValidationStatus
    FROM [dbo].[Ride] r
    LEFT JOIN [dbo].[Payment] p ON r.Payment = p.PaymentId
) AS PaymentValidation
WHERE ValidationStatus LIKE '❌%' OR ValidationStatus LIKE '⚠️%'
ORDER BY ValidationStatus, RideId;


-- =====================================================
-- 8. PAYMENT AMOUNT CONSISTENCY
-- =====================================================

-- Check: Payment amounts match ride prices and fee calculations
SELECT * FROM (
    SELECT 
        r.RideId,
        r.PriceFinal,
        p.GrossAmount,
        p.OsrhFee,
        p.DriverPayout,
        (p.OsrhFee + p.DriverPayout) AS CalculatedTotal,
        CASE 
            WHEN ABS(r.PriceFinal - p.GrossAmount) < 0.01 
                 AND ABS(p.GrossAmount - (p.OsrhFee + p.DriverPayout)) < 0.01 THEN '✅ Valid'
            WHEN ABS(r.PriceFinal - p.GrossAmount) >= 0.01 THEN '❌ Ride price != payment amount'
            WHEN ABS(p.GrossAmount - (p.OsrhFee + p.DriverPayout)) >= 0.01 THEN '❌ Payment breakdown incorrect'
            ELSE '⚠️  Unknown issue'
        END AS ValidationStatus
    FROM [dbo].[Ride] r
    JOIN [dbo].[Payment] p ON r.Payment = p.PaymentId
) AS AmountValidation
WHERE ValidationStatus LIKE '❌%'
ORDER BY ValidationStatus, RideId;


-- =====================================================
-- 9. DRIVER AVAILABILITY VALIDATION
-- =====================================================

-- Check: All driver availability references valid enrollments and zones
SELECT * FROM (
    SELECT 
        da.EnrollId,
        da.GeofencezoneId,
        da.AvailabilityDate,
        e.EnrollId AS EnrollmentExists,
        z.ZoneId AS ZoneExists,
        da.StartsAt,
        da.EndsAt,
        CASE 
            WHEN e.EnrollId IS NOT NULL AND z.ZoneId IS NOT NULL 
                 AND da.StartsAt < da.EndsAt THEN '✅ Valid'
            WHEN e.EnrollId IS NULL THEN '❌ Invalid enrollment reference'
            WHEN z.ZoneId IS NULL THEN '❌ Invalid zone reference'
            WHEN da.StartsAt >= da.EndsAt THEN '❌ Invalid time range'
            ELSE '⚠️  Unknown issue'
        END AS ValidationStatus
    FROM [dbo].[DriverAvailability] da
    LEFT JOIN [dbo].[UserServiceEnrollment] e ON da.EnrollId = e.EnrollId
    LEFT JOIN [dbo].[Geofencezone] z ON da.GeofencezoneId = z.ZoneId
) AS AvailabilityValidation
WHERE ValidationStatus LIKE '❌%'
ORDER BY ValidationStatus, EnrollId;


-- =====================================================
-- 10. RIDE REQUEST LOCATION VALIDATION
-- =====================================================

-- Check: Pickup/Drop coordinates should be within valid Cyprus bounds
SELECT * FROM (
    SELECT 
        RequestId,
        PickupLat,
        PickupLng,
        DropLat,
        DropLng,
        CASE 
            WHEN PickupLat BETWEEN 34.5 AND 35.7 
                 AND PickupLng BETWEEN 32.2 AND 34.6
                 AND DropLat BETWEEN 34.5 AND 35.7 
                 AND DropLng BETWEEN 32.2 AND 34.6 THEN '✅ Valid'
            ELSE '❌ Coordinates outside Cyprus bounds'
        END AS ValidationStatus
    FROM [dbo].[RideRequest]
) AS LocationValidation
WHERE ValidationStatus LIKE '❌%';


-- =====================================================
-- 11. ENROLLMENT APPROVAL VALIDATION
-- =====================================================

-- Check: Approved enrollments have valid operator references
SELECT * FROM (
    SELECT 
        e.EnrollId,
        e.Status,
        e.CheckedById,
        o.OperatorId,
        e.CheckedAt,
        CASE 
            WHEN e.Status = 'Approved' AND o.OperatorId IS NOT NULL AND e.CheckedAt IS NOT NULL THEN '✅ Valid'
            WHEN e.Status = 'Approved' AND o.OperatorId IS NULL THEN '❌ Approved without operator'
            WHEN e.Status = 'Approved' AND e.CheckedAt IS NULL THEN '❌ Approved without timestamp'
            WHEN e.Status != 'Approved' AND o.OperatorId IS NOT NULL THEN '⚠️  Non-approved has operator'
            ELSE '✅ Valid'
        END AS ValidationStatus
    FROM [dbo].[UserServiceEnrollment] e
    LEFT JOIN [dbo].[Operator] o ON e.CheckedById = o.OperatorId
) AS EnrollmentValidation
WHERE ValidationStatus LIKE '❌%' OR ValidationStatus LIKE '⚠️%'
ORDER BY ValidationStatus, EnrollId;


-- =====================================================
-- 12. ALLOWED RIDE PROFILE VALIDATION
-- =====================================================

-- Check: All ride profiles reference valid service/ride/vehicle types
SELECT 
    arp.RideProfileId,
    arp.ServiceTypeId,
    arp.RideTypeId,
    arp.VehicleTypeId,
    st.Name AS ServiceName,
    rt.Name AS RideName,
    vt.Name AS VehicleName,
    CASE 
        WHEN st.ServiceTypeId IS NOT NULL 
             AND rt.RideTypeId IS NOT NULL 
             AND vt.VehicleTypeId IS NOT NULL THEN '✅ Valid'
        WHEN st.ServiceTypeId IS NULL THEN '❌ Invalid service type'
        WHEN rt.RideTypeId IS NULL THEN '❌ Invalid ride type'
        WHEN vt.VehicleTypeId IS NULL THEN '❌ Invalid vehicle type'
        ELSE '⚠️  Unknown issue'
    END AS ValidationStatus
FROM [dbo].[AllowedRideProfile] arp
LEFT JOIN [dbo].[Servicetype] st ON arp.ServiceTypeId = st.ServiceTypeId
LEFT JOIN [dbo].[Ridetype] rt ON arp.RideTypeId = rt.RideTypeId
LEFT JOIN [dbo].[VehicleType] vt ON arp.VehicleTypeId = vt.VehicleTypeId
WHERE st.ServiceTypeId IS NULL OR rt.RideTypeId IS NULL OR vt.VehicleTypeId IS NULL;


-- =====================================================
-- 13. SUMMARY STATISTICS
-- =====================================================

-- Overview of data distribution
SELECT 
    'Total Zones' AS Metric, 
    COUNT(*) AS Count 
FROM [dbo].[Geofencezone]
UNION ALL
SELECT 'Total Bridges', COUNT(*) FROM [dbo].[Bridge]
UNION ALL
SELECT 'Total Ride Requests', COUNT(*) FROM [dbo].[RideRequest]
UNION ALL
SELECT 'Total Itinerary Legs', COUNT(*) FROM [dbo].[ItineraryLeg]
UNION ALL
SELECT 'Total Bridge Crossings', COUNT(*) FROM [dbo].[LegCrossesBridge]
UNION ALL
SELECT 'Bridged Route Requests', COUNT(DISTINCT rr.RequestId)
FROM [dbo].[RideRequest] rr
JOIN [dbo].[AllowedRideProfile] arp ON rr.RideProfileId = arp.RideProfileId
JOIN [dbo].[Servicetype] st ON arp.ServiceTypeId = st.ServiceTypeId
WHERE st.Name = 'bridged_route'
UNION ALL
SELECT 'Multi-leg Itineraries', COUNT(*)
FROM (
    SELECT RideRequestId
    FROM [dbo].[ItineraryLeg]
    GROUP BY RideRequestId
    HAVING COUNT(*) > 1
) AS MultiLegRequests
UNION ALL
SELECT 'Completed Rides', COUNT(*) FROM [dbo].[Ride] WHERE Status = 'Completed'
UNION ALL
SELECT 'Total Payments', COUNT(*) FROM [dbo].[Payment]
UNION ALL
SELECT 'Driver Availabilities', COUNT(*) FROM [dbo].[DriverAvailability];


-- =====================================================
-- 14. DISPATCH OFFERS VALIDATION
-- =====================================================

-- Check: All dispatch offers reference valid legs and drivers
SELECT * FROM (
    SELECT 
        do.OfferId,
        do.LegId,
        do.RecipientUserId,
        il.LegId AS LegExists,
        d.UserId AS DriverExists,
        CASE 
            WHEN il.LegId IS NOT NULL AND d.UserId IS NOT NULL THEN '✅ Valid'
            WHEN il.LegId IS NULL THEN '❌ Invalid leg reference'
            WHEN d.UserId IS NULL THEN '❌ Invalid driver reference'
            ELSE '⚠️  Unknown issue'
        END AS ValidationStatus
    FROM [dbo].[DispatchOffer] do
    LEFT JOIN [dbo].[ItineraryLeg] il ON do.LegId = il.LegId
    LEFT JOIN [dbo].[Driver] d ON do.RecipientUserId = d.UserId
) AS OfferValidation
WHERE ValidationStatus LIKE '❌%';