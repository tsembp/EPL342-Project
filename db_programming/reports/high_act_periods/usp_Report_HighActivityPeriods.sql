-- What This Does:
-- 1. Analyzes all historical data (no date range filter)
-- 2. Groups only by time period
-- 3. Calculates statistics:
--    - Trip count per period
--    - Average trip count across all periods
--    - Maximum trip count
--    - Standard deviation
-- 4. Identifies high activity periods:
--    - Shows percentage above/below average
--    - Labels periods as "High Activity", "Above Average", or "Normal"
-- 5. Sorted in descending order (busiest periods first)

CREATE OR ALTER PROCEDURE dbo.usp_Report_HighActivityPeriods
(
    @Frequency NVARCHAR(10) = 'month',      -- 'day','week','month','quarter','year'
    @ServiceTypeId     INT          = NULL,
    @RideStatus        NVARCHAR(50) = 'Completed',
    @PaymentStatus     NVARCHAR(50) = 'Completed',
    @PickupZoneId      INT          = NULL,
    @DropoffZoneId     INT          = NULL,
    @TopN              INT          = NULL           -- Optional: return only top N periods
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @Frequency IS NULL OR @Frequency NOT IN ('day','week','month','quarter','year')
    BEGIN
        ;THROW 52003, 'Frequency is mandatory and must be one of: day, week, month, quarter, year.', 1;
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
            -- NO time period filter allowed
            
            -- Service type filter
            (@ServiceTypeId IS NULL OR rf.ServiceTypeId = @ServiceTypeId)
            
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
    ),
    PeriodActivity AS
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
            END AS PeriodStart,
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
            END
    ),
    ActivityWithStats AS
    (
        SELECT
            pa.PeriodStart,
            pa.TripCount,
            AVG(pa.TripCount) OVER () AS AvgTripCount,
            STDEV(pa.TripCount) OVER () AS StdDevTripCount,
            MAX(pa.TripCount) OVER () AS MaxTripCount
        FROM PeriodActivity AS pa
    )
    SELECT TOP (ISNULL(@TopN, 2147483647))  -- If @TopN is NULL, return all rows
        PeriodStart,
        @Frequency AS PeriodGranularity,
        TripCount,
        AvgTripCount,
        MaxTripCount,
        -- Calculate how much higher than average (as percentage)
        CAST(ROUND(
            ( (TripCount - AvgTripCount) * 100.0 ) / NULLIF(AvgTripCount, 0),
            2
        ) AS DECIMAL(10,2)) AS PercentAboveAverage,
        -- Identify if this is a "high activity" period (more than 1 std dev above average)
        CASE 
            WHEN TripCount > (AvgTripCount + ISNULL(StdDevTripCount, 0))
            THEN 'High Activity'
            WHEN TripCount > AvgTripCount
            THEN 'Above Average'
            ELSE 'Normal'
        END AS ActivityLevel
    FROM ActivityWithStats
    ORDER BY TripCount DESC;  -- Descending order
END;
GO
