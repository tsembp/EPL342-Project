CREATE OR ALTER PROCEDURE dbo.usp_Report_DriverVehiclePerformance
(
    @FromDate          DATE         = NULL,
    @ToDate            DATE         = NULL,
    @PeriodGranularity NVARCHAR(10) = NULL,         -- Optional: 'day','week','month','quarter','year'
    @ServiceTypeId     INT          = NULL,
    @RideStatus        NVARCHAR(50) = 'Completed',  -- Default: completed rides
    @PaymentStatus     NVARCHAR(50) = 'Completed',
    @PickupZoneId      INT          = NULL,
    @DropoffZoneId     INT          = NULL,
    @MinRating         DECIMAL(3,2) = NULL,         -- Filter: minimum average rating
    @MinTrips          INT          = NULL,         -- Filter: minimum number of trips
    @GroupBy           NVARCHAR(20) = 'DRIVER',     -- 'DRIVER', 'VEHICLE', or 'BOTH'
    @TopN              INT          = NULL,         -- Optional: return only top N performers
    @OrderBy           NVARCHAR(20) = 'TRIPS'       -- 'TRIPS' or 'RATING'
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @FromDate IS NOT NULL AND @ToDate IS NOT NULL AND @FromDate > @ToDate
    BEGIN
        ;THROW 52006, 'FromDate must be <= ToDate.', 1;
    END;

    IF @GroupBy NOT IN ('DRIVER', 'VEHICLE', 'BOTH')
    BEGIN
        ;THROW 52007, 'GroupBy must be one of: DRIVER, VEHICLE, BOTH.', 1;
    END;

    IF @OrderBy NOT IN ('TRIPS', 'RATING')
    BEGIN
        SET @OrderBy = 'TRIPS';
    END;

    ;WITH FilteredRides AS
    (
        SELECT
            rf.RideId,
            rf.DriverUserId,
            rf.VehicleId,
            rf.PassengerUserId,
            rf.ServiceTypeId,
            rf.ServiceTypeName,
            rf.RideTypeId,
            rf.RideTypeName,
            rf.VehicleTypeName,
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
    ),
    DriverRatings AS
    (
        -- Get ratings where driver is the target (rated by passengers)
        SELECT
            r.TargetUserId AS DriverUserId,
            r.RideId,
            r.Stars,
            r.Comment,
            r.CreatedAt AS RatingDate
        FROM dbo.Rating AS r
        INNER JOIN FilteredRides AS fr ON r.RideId = fr.RideId
        WHERE r.TargetUserId = fr.DriverUserId  -- Driver was rated
    ),
    PerformanceStats AS
    (
        SELECT
            -- Period grouping (if specified)
            CASE 
                WHEN @PeriodGranularity IS NOT NULL THEN
                    CASE @PeriodGranularity
                        WHEN 'day' THEN CONVERT(VARCHAR(10), CONVERT(DATE, fr.EndedAt), 120)
                        WHEN 'week' THEN CONVERT(VARCHAR(10), DATEADD(WEEK, DATEDIFF(WEEK, 0, fr.EndedAt), 0), 120)
                        WHEN 'month' THEN CONVERT(VARCHAR(7), fr.EndedAt, 120)
                        WHEN 'quarter' THEN CONCAT(YEAR(fr.EndedAt), '-Q', DATEPART(QUARTER, fr.EndedAt))
                        WHEN 'year' THEN CAST(YEAR(fr.EndedAt) AS VARCHAR(4))
                    END
                ELSE NULL
            END AS Period,
            
            -- Grouping columns
            CASE WHEN @GroupBy IN ('DRIVER', 'BOTH') THEN fr.DriverUserId ELSE NULL END AS DriverUserId,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleId ELSE NULL END AS VehicleId,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleTypeName ELSE NULL END AS VehicleTypeName,
            
            -- Performance metrics
            COUNT(DISTINCT fr.RideId) AS CompletedTrips,
            COUNT(DISTINCT fr.PassengerUserId) AS UniquePassengers,
            
            -- Rating statistics
            COUNT(DISTINCT dr.RideId) AS RatedTrips,
            CAST(AVG(CAST(dr.Stars AS FLOAT)) AS DECIMAL(3,2)) AS AvgRating,
            MIN(dr.Stars) AS MinRating,
            MAX(dr.Stars) AS MaxRating,
            CAST(STDEV(CAST(dr.Stars AS FLOAT)) AS DECIMAL(3,2)) AS StdDevRating,
            
            -- Financial metrics
            CAST(SUM(fr.PriceFinal) AS DECIMAL(12,2)) AS TotalRevenue,
            CAST(AVG(fr.PriceFinal) AS DECIMAL(10,2)) AS AvgTripCost,
            
            -- Operational metrics
            CAST(SUM(fr.DistanceKm) AS DECIMAL(12,2)) AS TotalDistanceKm,
            CAST(AVG(fr.DistanceKm) AS DECIMAL(10,2)) AS AvgDistanceKm,
            CAST(SUM(fr.DurationMinutes) AS DECIMAL(12,2)) AS TotalDurationMinutes,
            CAST(AVG(fr.DurationMinutes) AS DECIMAL(10,2)) AS AvgDurationMinutes,
            
            -- Rating distribution
            SUM(CASE WHEN dr.Stars = 5 THEN 1 ELSE 0 END) AS FiveStarCount,
            SUM(CASE WHEN dr.Stars = 4 THEN 1 ELSE 0 END) AS FourStarCount,
            SUM(CASE WHEN dr.Stars = 3 THEN 1 ELSE 0 END) AS ThreeStarCount,
            SUM(CASE WHEN dr.Stars = 2 THEN 1 ELSE 0 END) AS TwoStarCount,
            SUM(CASE WHEN dr.Stars = 1 THEN 1 ELSE 0 END) AS OneStarCount,
            
            -- Performance indicators
            CAST(
                (COUNT(DISTINCT dr.RideId) * 100.0) / NULLIF(COUNT(DISTINCT fr.RideId), 0)
            AS DECIMAL(5,2)) AS RatingPercentage,
            
            CAST(
                (SUM(CASE WHEN dr.Stars >= 4 THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(dr.Stars), 0)
            AS DECIMAL(5,2)) AS PositiveRatingPercentage
            
        FROM FilteredRides AS fr
        LEFT JOIN DriverRatings AS dr 
            ON fr.RideId = dr.RideId 
            AND fr.DriverUserId = dr.DriverUserId
        GROUP BY
            CASE 
                WHEN @PeriodGranularity IS NOT NULL THEN
                    CASE @PeriodGranularity
                        WHEN 'day' THEN CONVERT(VARCHAR(10), CONVERT(DATE, fr.EndedAt), 120)
                        WHEN 'week' THEN CONVERT(VARCHAR(10), DATEADD(WEEK, DATEDIFF(WEEK, 0, fr.EndedAt), 0), 120)
                        WHEN 'month' THEN CONVERT(VARCHAR(7), fr.EndedAt, 120)
                        WHEN 'quarter' THEN CONCAT(YEAR(fr.EndedAt), '-Q', DATEPART(QUARTER, fr.EndedAt))
                        WHEN 'year' THEN CAST(YEAR(fr.EndedAt) AS VARCHAR(4))
                    END
                ELSE NULL
            END,
            CASE WHEN @GroupBy IN ('DRIVER', 'BOTH') THEN fr.DriverUserId ELSE NULL END,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleId ELSE NULL END,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleTypeName ELSE NULL END
    ),
    RankedPerformance AS
    (
        SELECT
            ps.*,
            -- Add driver details
            CASE WHEN @GroupBy IN ('DRIVER', 'BOTH') THEN
                u.FirstName + ' ' + u.LastName
            ELSE NULL END AS DriverName,
            CASE WHEN @GroupBy IN ('DRIVER', 'BOTH') THEN
                u.Email
            ELSE NULL END AS DriverEmail,
            
            -- Performance ranking
            ROW_NUMBER() OVER (
                PARTITION BY ps.Period
                ORDER BY 
                    CASE WHEN @OrderBy = 'TRIPS' THEN ps.CompletedTrips END DESC,
                    CASE WHEN @OrderBy = 'RATING' THEN ps.AvgRating END DESC,
                    ps.CompletedTrips DESC
            ) AS PerformanceRank,
            
            -- Performance category
            CASE
                WHEN ps.AvgRating >= 4.5 AND ps.CompletedTrips >= ISNULL(@MinTrips, 0)
                    THEN 'Excellent'
                WHEN ps.AvgRating >= 4.0 AND ps.CompletedTrips >= ISNULL(@MinTrips, 0)
                    THEN 'Good'
                WHEN ps.AvgRating >= 3.5
                    THEN 'Satisfactory'
                WHEN ps.AvgRating >= 3.0
                    THEN 'Needs Improvement'
                ELSE 'Poor'
            END AS PerformanceCategory
            
        FROM PerformanceStats AS ps
        LEFT JOIN dbo.[User] AS u ON ps.DriverUserId = u.UserId
        WHERE
            -- Apply filters
            (@MinRating IS NULL OR ps.AvgRating >= @MinRating)
            AND (@MinTrips IS NULL OR ps.CompletedTrips >= @MinTrips)
    )
    SELECT TOP (ISNULL(@TopN, 2147483647))
        Period,
        @PeriodGranularity AS PeriodGranularity,
        DriverUserId,
        DriverName,
        DriverEmail,
        VehicleId,
        VehicleTypeName,
        CompletedTrips,
        UniquePassengers,
        RatedTrips,
        AvgRating,
        MinRating,
        MaxRating,
        StdDevRating,
        RatingPercentage,
        PositiveRatingPercentage,
        FiveStarCount,
        FourStarCount,
        ThreeStarCount,
        TwoStarCount,
        OneStarCount,
        TotalRevenue,
        AvgTripCost,
        TotalDistanceKm,
        AvgDistanceKm,
        TotalDurationMinutes,
        AvgDurationMinutes,
        PerformanceRank,
        PerformanceCategory
    FROM RankedPerformance
    ORDER BY
        Period DESC,
        CASE WHEN @OrderBy = 'TRIPS' THEN CompletedTrips END DESC,
        CASE WHEN @OrderBy = 'RATING' THEN AvgRating END DESC,
        CompletedTrips DESC;
END;
GO