CREATE OR ALTER PROCEDURE dbo.usp_Report_AverageCostByCategory
(
    @FromDate          DATE         = NULL,
    @ToDate            DATE         = NULL,
    @Frequency NVARCHAR(10) = NULL,         -- Optional grouping: 'day','week','month','quarter','year'
    @ServiceTypeId     INT          = NULL,
    @RideStatus        NVARCHAR(50) = 'Completed',
    @PaymentStatus     NVARCHAR(50) = 'Completed',
    @PickupZoneId      INT          = NULL,
    @DropoffZoneId     INT          = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @FromDate IS NOT NULL AND @ToDate IS NOT NULL AND @FromDate > @ToDate
    BEGIN
        ;THROW 52004, 'FromDate must be <= ToDate.', 1;
    END;

    ;WITH FilteredRides AS
    (
        SELECT
            rf.RideId,
            rf.ServiceTypeId,
            rf.ServiceTypeName,
            rf.RideTypeId,
            rf.RideTypeName,
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
    )
    SELECT
        -- Period grouping (if specified)
        CASE 
            WHEN @Frequency IS NOT NULL THEN
                CASE @Frequency
                    WHEN 'day' THEN CONVERT(VARCHAR(10), CONVERT(DATE, fr.EndedAt), 120)
                    WHEN 'week' THEN CONVERT(VARCHAR(10), DATEADD(WEEK, DATEDIFF(WEEK, 0, fr.EndedAt), 0), 120)
                    WHEN 'month' THEN CONVERT(VARCHAR(7), fr.EndedAt, 120)
                    WHEN 'quarter' THEN CONCAT(YEAR(fr.EndedAt), '-Q', DATEPART(QUARTER, fr.EndedAt))
                    WHEN 'year' THEN CAST(YEAR(fr.EndedAt) AS VARCHAR(4))
                END
            ELSE NULL
        END AS [Period],
        @Frequency AS PeriodGranularity,
        fr.ServiceTypeId,
        fr.ServiceTypeName,
        fr.RideTypeId,
        fr.RideTypeName,
        COUNT(*) AS TripCount,
        CAST(AVG(fr.PriceFinal) AS DECIMAL(10,2)) AS AverageCost,
        CAST(MIN(fr.PriceFinal) AS DECIMAL(10,2)) AS MinCost,
        CAST(MAX(fr.PriceFinal) AS DECIMAL(10,2)) AS MaxCost,
        CAST(STDEV(fr.PriceFinal) AS DECIMAL(10,2)) AS StdDevCost,
        -- Additional metrics
        CAST(AVG(fr.DistanceKm) AS DECIMAL(10,2)) AS AvgDistanceKm,
        CAST(AVG(fr.DurationMinutes) AS DECIMAL(10,2)) AS AvgDurationMinutes,
        CAST(AVG(fr.PriceFinal / NULLIF(fr.DistanceKm, 0)) AS DECIMAL(10,2)) AS AvgCostPerKm
    FROM FilteredRides AS fr
    GROUP BY
        CASE 
            WHEN @Frequency IS NOT NULL THEN
                CASE @Frequency
                    WHEN 'day' THEN CONVERT(VARCHAR(10), CONVERT(DATE, fr.EndedAt), 120)
                    WHEN 'week' THEN CONVERT(VARCHAR(10), DATEADD(WEEK, DATEDIFF(WEEK, 0, fr.EndedAt), 0), 120)
                    WHEN 'month' THEN CONVERT(VARCHAR(7), fr.EndedAt, 120)
                    WHEN 'quarter' THEN CONCAT(YEAR(fr.EndedAt), '-Q', DATEPART(QUARTER, fr.EndedAt))
                    WHEN 'year' THEN CAST(YEAR(fr.EndedAt) AS VARCHAR(4))
                END
            ELSE NULL
        END,
        fr.ServiceTypeId,
        fr.ServiceTypeName,
        fr.RideTypeId,
        fr.RideTypeName
    ORDER BY 
        CASE 
            WHEN @Frequency IS NOT NULL THEN
                CASE @Frequency
                    WHEN 'day'     THEN CONVERT(VARCHAR(10), CONVERT(DATE, fr.EndedAt), 120)
                    WHEN 'week'    THEN CONVERT(VARCHAR(10), DATEADD(WEEK, DATEDIFF(WEEK, 0, fr.EndedAt), 0), 120)
                    WHEN 'month'   THEN CONVERT(VARCHAR(7), fr.EndedAt, 120)
                    WHEN 'quarter' THEN CONCAT(YEAR(fr.EndedAt), '-Q', DATEPART(QUARTER, fr.EndedAt))
                    WHEN 'year'    THEN CAST(YEAR(fr.EndedAt) AS VARCHAR(4))
                END
            ELSE NULL
        END DESC,
        fr.ServiceTypeName,
        fr.RideTypeName;
END;
GO