-- =============================================
-- View: vw_ZoneDemand
-- Description: Current demand metrics per zone (pending requests vs available drivers)
-- =============================================
IF OBJECT_ID('dbo.vw_ZoneDemand', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ZoneDemand;
GO

CREATE VIEW dbo.vw_ZoneDemand
AS
WITH PendingRequestsByZone AS (
    -- Count pending ride requests per zone, service type, and ride type
    SELECT 
        il.ZoneId,
        arp.ServiceTypeId,
        arp.RideTypeId,
        COUNT(DISTINCT rr.RequestId) AS PendingRequestCount,
        MIN(rr.CreatedAt) AS OldestRequestTime,
        MAX(rr.CreatedAt) AS NewestRequestTime
    FROM dbo.RideRequest rr
    INNER JOIN dbo.ItineraryLeg il ON rr.RequestId = il.RideRequestId
    INNER JOIN dbo.AllowedRideProfile arp ON rr.RideProfileId = arp.RideProfileId
    WHERE rr.Status IN ('Pending', 'Accepted')
        AND rr.CreatedAt >= DATEADD(MINUTE, -30, GETUTCDATE())  -- Last 30 minutes
    GROUP BY il.ZoneId, arp.ServiceTypeId, arp.RideTypeId
),
AvailableDriversByZone AS (
    -- Count available drivers per zone, service type, and ride type (for current time)
    SELECT 
        da.GeofencezoneId AS ZoneId,
        use_enroll.ServiceType AS ServiceTypeId,
        use_enroll.RideType AS RideTypeId,
        COUNT(DISTINCT da.EnrollId) AS AvailableDriverCount
    FROM dbo.DriverAvailability da
    INNER JOIN dbo.UserServiceEnrollment use_enroll ON da.EnrollId = use_enroll.EnrollId
    WHERE use_enroll.Status = 'Approved'
        AND da.AvailabilityDate = CAST(GETUTCDATE() AS DATE)
        AND CAST(GETUTCDATE() AS TIME) BETWEEN da.StartsAt AND da.EndsAt
    GROUP BY da.GeofencezoneId, use_enroll.ServiceType, use_enroll.RideType
)
SELECT 
    -- Zone information
    gz.ZoneId,
    gz.Name AS ZoneName,
    gz.MinLat,
    gz.MinLng,
    gz.MaxLat,
    gz.MaxLng,
    
    -- Service type
    st.ServiceTypeId,
    st.Name AS ServiceTypeName,
    
    -- Ride type
    rt.RideTypeId,
    rt.Name AS RideTypeName,
    
    -- Demand metrics
    ISNULL(pr.PendingRequestCount, 0) AS PendingRequests,
    ISNULL(ad.AvailableDriverCount, 0) AS AvailableDrivers,
    
    -- Calculate demand ratio (avoid division by zero)
    CASE 
        WHEN ISNULL(ad.AvailableDriverCount, 0) = 0 THEN 999.99
        ELSE CAST(ISNULL(pr.PendingRequestCount, 0) AS DECIMAL(10,2)) / 
             CAST(ad.AvailableDriverCount AS DECIMAL(10,2))
    END AS DemandRatio,
    
    -- Surge multiplier based on demand ratio
    CASE 
        WHEN ISNULL(ad.AvailableDriverCount, 0) = 0 THEN 2.0
        WHEN CAST(ISNULL(pr.PendingRequestCount, 0) AS DECIMAL(10,2)) / 
             CAST(ad.AvailableDriverCount AS DECIMAL(10,2)) > 4.0 THEN 2.0
        WHEN CAST(ISNULL(pr.PendingRequestCount, 0) AS DECIMAL(10,2)) / 
             CAST(ad.AvailableDriverCount AS DECIMAL(10,2)) > 2.5 THEN 1.5
        WHEN CAST(ISNULL(pr.PendingRequestCount, 0) AS DECIMAL(10,2)) / 
             CAST(ad.AvailableDriverCount AS DECIMAL(10,2)) > 1.5 THEN 1.2
        ELSE 1.0
    END AS SurgeMultiplier,
    
    -- Demand level classification
    CASE 
        WHEN ISNULL(ad.AvailableDriverCount, 0) = 0 THEN 'CRITICAL'
        WHEN CAST(ISNULL(pr.PendingRequestCount, 0) AS DECIMAL(10,2)) / 
             CAST(ad.AvailableDriverCount AS DECIMAL(10,2)) > 4.0 THEN 'HIGH'
        WHEN CAST(ISNULL(pr.PendingRequestCount, 0) AS DECIMAL(10,2)) / 
             CAST(ad.AvailableDriverCount AS DECIMAL(10,2)) > 2.5 THEN 'MEDIUM'
        WHEN CAST(ISNULL(pr.PendingRequestCount, 0) AS DECIMAL(10,2)) / 
             CAST(ad.AvailableDriverCount AS DECIMAL(10,2)) > 1.5 THEN 'LOW'
        ELSE 'NORMAL'
    END AS DemandLevel,
    
    -- Time information
    pr.OldestRequestTime,
    pr.NewestRequestTime,
    GETUTCDATE() AS AsOfTime

FROM dbo.Geofencezone gz
CROSS JOIN dbo.Servicetype st
CROSS JOIN dbo.Ridetype rt
LEFT JOIN PendingRequestsByZone pr ON gz.ZoneId = pr.ZoneId 
    AND st.ServiceTypeId = pr.ServiceTypeId 
    AND rt.RideTypeId = pr.RideTypeId
LEFT JOIN AvailableDriversByZone ad ON gz.ZoneId = ad.ZoneId 
    AND st.ServiceTypeId = ad.ServiceTypeId 
    AND rt.RideTypeId = ad.RideTypeId

WHERE st.Active = 1
    AND (pr.PendingRequestCount IS NOT NULL OR ad.AvailableDriverCount IS NOT NULL);
GO

PRINT 'View vw_ZoneDemand created successfully.';
GO
