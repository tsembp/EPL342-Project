CREATE OR ALTER PROCEDURE dbo.usp_Report_HighLowCostTrips
(
    @FromDate          DATE         = NULL,
    @ToDate            DATE         = NULL,
    @ServiceTypeId     INT          = NULL,
    @RideStatus        NVARCHAR(50) = 'Completed',
    @PaymentStatus     NVARCHAR(50) = 'Completed',
    @PickupZoneId      INT          = NULL,
    @DropoffZoneId     INT          = NULL,
    @TopN              INT          = 10             -- Number of top/bottom trips to show
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @FromDate IS NOT NULL AND @ToDate IS NOT NULL AND @FromDate > @ToDate
    BEGIN
        ;THROW 52005, 'FromDate must be <= ToDate.', 1;
    END;

    IF @TopN IS NULL OR @TopN < 1
    BEGIN
        SET @TopN = 10;  -- Default to top 10
    END;

    ;WITH FilteredRides AS
    (
        SELECT
            rf.RideId,
            rf.ServiceTypeId,
            rf.ServiceTypeName,
            rf.RideTypeId,
            rf.RideTypeName,
            rf.DriverUserId,
            rf.PassengerUserId,
            rf.VehicleId,
            rf.VehicleTypeName,
            rf.StartedAt,
            rf.EndedAt,
            rf.PriceFinal,
            rf.DistanceKm,
            rf.DurationMinutes,
            rf.RideStatus,
            rf.PaymentStatus,
            rf.PickupPointId,
            rf.DropoffPointId
        FROM dbo.vw_RideFact AS rf
        WHERE
            -- Time filter
            (@FromDate IS NULL OR CAST(rf.EndedAt AS DATE) >= @FromDate)
            AND (@ToDate IS NULL OR CAST(rf.EndedAt AS DATE) <= @ToDate)
            
            -- Service type filter
            AND (@ServiceTypeId IS NULL OR rf.ServiceTypeId = @ServiceTypeId)
            
            -- Ride status filter
            AND (@RideStatus IS NULL OR rf.RideStatus = @RideStatus)
            
            -- Payment status filter
            AND (@PaymentStatus IS NULL OR rf.PaymentStatus = @PaymentStatus)
            
            -- Location filters
            AND (@PickupZoneId IS NULL OR EXISTS (
                SELECT 1 FROM dbo.ZonePoint zp 
                WHERE zp.PointId = rf.PickupPointId 
                AND zp.ZoneId = @PickupZoneId
            ))
            AND (@DropoffZoneId IS NULL OR EXISTS (
                SELECT 1 FROM dbo.ZonePoint zp 
                WHERE zp.PointId = rf.DropoffPointId 
                AND zp.ZoneId = @DropoffZoneId
            ))
            -- Only include rides with valid prices
            AND rf.PriceFinal IS NOT NULL
            AND rf.PriceFinal > 0
    ),
    HighestCostTrips AS
    (
        SELECT TOP (@TopN)
            'HIGHEST' AS CostCategory,
            1 AS SortOrder,
            fr.RideId,
            fr.ServiceTypeName,
            fr.RideTypeName,
            fr.VehicleTypeName,
            fr.StartedAt,
            fr.EndedAt,
            fr.PriceFinal,
            fr.DistanceKm,
            fr.DurationMinutes,
            CAST(fr.PriceFinal / NULLIF(fr.DistanceKm, 0) AS DECIMAL(10,2)) AS CostPerKm,
            fr.DriverUserId,
            fr.PassengerUserId,
            fr.VehicleId
        FROM FilteredRides AS fr
        ORDER BY fr.PriceFinal DESC
    ),
    LowestCostTrips AS
    (
        SELECT TOP (@TopN)
            'LOWEST' AS CostCategory,
            2 AS SortOrder,
            fr.RideId,
            fr.ServiceTypeName,
            fr.RideTypeName,
            fr.VehicleTypeName,
            fr.StartedAt,
            fr.EndedAt,
            fr.PriceFinal,
            fr.DistanceKm,
            fr.DurationMinutes,
            CAST(fr.PriceFinal / NULLIF(fr.DistanceKm, 0) AS DECIMAL(10,2)) AS CostPerKm,
            fr.DriverUserId,
            fr.PassengerUserId,
            fr.VehicleId
        FROM FilteredRides AS fr
        ORDER BY fr.PriceFinal ASC
    )
    SELECT * FROM HighestCostTrips
    UNION ALL
    SELECT * FROM LowestCostTrips
    ORDER BY SortOrder, PriceFinal DESC;
END;
GO