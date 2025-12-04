-- What This Does:
-- 1. Filters rides by time, status, and optionally location
-- 2. Groups by period AND service type to get trip counts per category
-- 3. Calculates totals per period across all categories
-- 4. Computes percentage: (TripCount/TotalTripsInPeriod)*100
-- 5. Shows comparison of all ride categories side-by-side

CREATE OR ALTER PROCEDURE dbo.usp_Report_TripTrends
(
    @FromDate          DATE         = NULL,
    @ToDate            DATE         = NULL,
    @Frequency         NVARCHAR(10) = 'month',      -- 'day','week','month','quarter','year'
    @RideStatus        NVARCHAR(50) = 'Completed',
    @PaymentStatus     NVARCHAR(50) = 'Completed',
    -- Location filters
    @PickupZoneId      INT          = NULL,
    @DropoffZoneId     INT          = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @FromDate IS NOT NULL AND @ToDate IS NOT NULL AND @FromDate > @ToDate
    BEGIN
        ;THROW 52002, 'FromDate must be <= ToDate.', 1;
    END;

    ;WITH FilteredRides AS
    (
        SELECT
            rf.RideId,
            rf.ServiceTypeId,
            rf.ServiceTypeName,
            rf.EndedAt,
            rf.RideStatus,
            rf.PaymentStatus,
            rf.PickupPointId,
            rf.DropoffPointId
        FROM dbo.vw_RideFact AS rf
        WHERE
            -- Time filter
            (@FromDate IS NULL OR CAST(rf.EndedAt AS DATE) >= @FromDate)
            AND (@ToDate IS NULL OR CAST(rf.EndedAt AS DATE) <= @ToDate)
            
            -- Ride status filter
            AND (@RideStatus IS NULL OR rf.RideStatus = @RideStatus)
            
            -- Payment status filter
            AND (@PaymentStatus IS NULL OR rf.PaymentStatus = @PaymentStatus)
            
            -- Location filters (if zones are provided)
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
    ),
    PeriodTotals AS
    (
        SELECT
            CASE @Frequency
                WHEN 'day' THEN CONVERT(DATE, fr.EndedAt)
                WHEN 'week' THEN DATEADD(WEEK, DATEDIFF(WEEK, 0, fr.EndedAt), 0)
                WHEN 'month' THEN DATEFROMPARTS(YEAR(fr.EndedAt), MONTH(fr.EndedAt), 1)
                WHEN 'quarter' THEN DATEFROMPARTS(
                    YEAR(fr.EndedAt),
                    ((DATEPART(QUARTER, fr.EndedAt) - 1) * 3) + 1,
                    1
                )
                WHEN 'year' THEN DATEFROMPARTS(YEAR(fr.EndedAt), 1, 1)
                ELSE CONVERT(DATE, fr.EndedAt)
            END AS PeriodStart,
            fr.ServiceTypeId,
            fr.ServiceTypeName,
            COUNT(*) AS TripCount
        FROM FilteredRides AS fr
        GROUP BY
            CASE @Frequency
                WHEN 'day' THEN CONVERT(DATE, fr.EndedAt)
                WHEN 'week' THEN DATEADD(WEEK, DATEDIFF(WEEK, 0, fr.EndedAt), 0)
                WHEN 'month' THEN DATEFROMPARTS(YEAR(fr.EndedAt), MONTH(fr.EndedAt), 1)
                WHEN 'quarter' THEN DATEFROMPARTS(
                    YEAR(fr.EndedAt),
                    ((DATEPART(QUARTER, fr.EndedAt) - 1) * 3) + 1,
                    1
                )
                WHEN 'year' THEN DATEFROMPARTS(YEAR(fr.EndedAt), 1, 1)
                ELSE CONVERT(DATE, fr.EndedAt)
            END,
            fr.ServiceTypeId,
            fr.ServiceTypeName
    ),
    PeriodGrandTotals AS
    (
        SELECT
            PeriodStart,
            SUM(TripCount) AS TotalTripsInPeriod
        FROM PeriodTotals
        GROUP BY PeriodStart
    )
    SELECT
        pt.PeriodStart,
        @Frequency AS PeriodGranularity,
        pt.ServiceTypeId,
        pt.ServiceTypeName,
        pt.TripCount,
        pgt.TotalTripsInPeriod,
        CAST(ROUND(
            (pt.TripCount * 100.0) / NULLIF(pgt.TotalTripsInPeriod, 0),
            2
        ) AS DECIMAL(5,2)) AS PercentageOfTotal
    FROM PeriodTotals AS pt
    INNER JOIN PeriodGrandTotals AS pgt
        ON pt.PeriodStart = pgt.PeriodStart
    ORDER BY 
        pt.PeriodStart DESC, 
        pt.TripCount DESC;
END;
GO
