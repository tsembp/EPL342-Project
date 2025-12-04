CREATE OR ALTER PROCEDURE dbo.usp_Report_DriverVehicleEarnings
(
    @GroupBy           NVARCHAR(20) = 'DRIVER',     -- 'DRIVER', 'VEHICLE', or 'BOTH'
    @ServiceTypeId     INT          = NULL,
    @RideStatus        NVARCHAR(50) = 'COMPLETED',
    @PaymentStatus     NVARCHAR(50) = 'Completed',
    @PickupZoneId      INT          = NULL,
    @DropoffZoneId     INT          = NULL,
    @MinTrips          INT          = NULL,         -- Filter: minimum number of trips
    @MinEarnings       DECIMAL(12,2)= NULL,         -- Filter: minimum earnings
    @IncludeCurrentYear BIT         = 1,            -- Include monthly breakdown for current year
    @IncludeLast3Years  BIT         = 1,            -- Include summary for last 3 years
    @CurrentYearOverride INT        = NULL          -- For testing: override current year
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @GroupBy NOT IN ('DRIVER', 'VEHICLE', 'BOTH')
    BEGIN
        ;THROW 52008, 'GroupBy must be one of: DRIVER, VEHICLE, BOTH.', 1;
    END;

    DECLARE @CurrentYear INT = ISNULL(@CurrentYearOverride, YEAR(GETDATE()));
    DECLARE @ThreeYearsAgo INT = @CurrentYear - 3;

    ;WITH FilteredRides AS
    (
        SELECT
            rf.RideId,
            rf.DriverUserId,
            rf.VehicleId,
            rf.ServiceTypeId,
            rf.ServiceTypeName,
            rf.VehicleTypeName,
            rf.EndedAt,
            rf.PriceFinal,
            rf.DriverPayout,
            rf.GrossAmount,
            rf.PlatformFee,
            rf.RideStatus,
            rf.PaymentStatus,
            rf.PickupPointId,
            rf.DropoffPointId,
            YEAR(rf.EndedAt) AS RideYear,
            MONTH(rf.EndedAt) AS RideMonth
        FROM dbo.vw_RideFact AS rf
        WHERE
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
            
            -- Time filter: current year OR last 3 years
            AND (
                (@IncludeCurrentYear = 1 AND YEAR(rf.EndedAt) = @CurrentYear)
                OR
                (@IncludeLast3Years = 1 AND YEAR(rf.EndedAt) >= @ThreeYearsAgo AND YEAR(rf.EndedAt) < @CurrentYear)
            )
    ),
    -- Monthly earnings for current year
    CurrentYearMonthly AS
    (
        SELECT
            CASE WHEN @GroupBy IN ('DRIVER', 'BOTH') THEN fr.DriverUserId ELSE NULL END AS DriverUserId,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleId ELSE NULL END AS VehicleId,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleTypeName ELSE NULL END AS VehicleTypeName,
            fr.RideMonth,
            COUNT(*) AS CompletedTrips,
            CAST(SUM(fr.DriverPayout) AS DECIMAL(12,2)) AS TotalEarnings,
            CAST(SUM(fr.GrossAmount) AS DECIMAL(12,2)) AS TotalGrossAmount,
            CAST(SUM(fr.PlatformFee) AS DECIMAL(12,2)) AS TotalPlatformFee,
            CAST(AVG(fr.DriverPayout) AS DECIMAL(10,2)) AS AvgEarningsPerTrip
        FROM FilteredRides AS fr
        WHERE fr.RideYear = @CurrentYear
            AND @IncludeCurrentYear = 1
        GROUP BY
            CASE WHEN @GroupBy IN ('DRIVER', 'BOTH') THEN fr.DriverUserId ELSE NULL END,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleId ELSE NULL END,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleTypeName ELSE NULL END,
            fr.RideMonth
    ),
    -- Yearly summary for last 3 years
    Last3YearsSummary AS
    (
        SELECT
            CASE WHEN @GroupBy IN ('DRIVER', 'BOTH') THEN fr.DriverUserId ELSE NULL END AS DriverUserId,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleId ELSE NULL END AS VehicleId,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleTypeName ELSE NULL END AS VehicleTypeName,
            fr.RideYear,
            COUNT(*) AS CompletedTrips,
            CAST(SUM(fr.DriverPayout) AS DECIMAL(12,2)) AS TotalEarnings,
            CAST(SUM(fr.GrossAmount) AS DECIMAL(12,2)) AS TotalGrossAmount,
            CAST(SUM(fr.PlatformFee) AS DECIMAL(12,2)) AS TotalPlatformFee,
            CAST(AVG(fr.DriverPayout) AS DECIMAL(10,2)) AS AvgEarningsPerTrip
        FROM FilteredRides AS fr
        WHERE fr.RideYear >= @ThreeYearsAgo 
            AND fr.RideYear < @CurrentYear
            AND @IncludeLast3Years = 1
        GROUP BY
            CASE WHEN @GroupBy IN ('DRIVER', 'BOTH') THEN fr.DriverUserId ELSE NULL END,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleId ELSE NULL END,
            CASE WHEN @GroupBy IN ('VEHICLE', 'BOTH') THEN fr.VehicleTypeName ELSE NULL END,
            fr.RideYear
    ),
    -- Combine and pivot current year monthly data
    CombinedData AS
    (
        SELECT
            ISNULL(cym.DriverUserId, lys.DriverUserId) AS DriverUserId,
            ISNULL(cym.VehicleId, lys.VehicleId) AS VehicleId,
            ISNULL(cym.VehicleTypeName, lys.VehicleTypeName) AS VehicleTypeName,
            
            -- Current Year Monthly Data (Pivoted)
            SUM(CASE WHEN cym.RideMonth = 1 THEN cym.CompletedTrips ELSE 0 END) AS Jan_Trips,
            SUM(CASE WHEN cym.RideMonth = 1 THEN cym.TotalEarnings ELSE 0 END) AS Jan_Earnings,
            
            SUM(CASE WHEN cym.RideMonth = 2 THEN cym.CompletedTrips ELSE 0 END) AS Feb_Trips,
            SUM(CASE WHEN cym.RideMonth = 2 THEN cym.TotalEarnings ELSE 0 END) AS Feb_Earnings,
            
            SUM(CASE WHEN cym.RideMonth = 3 THEN cym.CompletedTrips ELSE 0 END) AS Mar_Trips,
            SUM(CASE WHEN cym.RideMonth = 3 THEN cym.TotalEarnings ELSE 0 END) AS Mar_Earnings,
            
            SUM(CASE WHEN cym.RideMonth = 4 THEN cym.CompletedTrips ELSE 0 END) AS Apr_Trips,
            SUM(CASE WHEN cym.RideMonth = 4 THEN cym.TotalEarnings ELSE 0 END) AS Apr_Earnings,
            
            SUM(CASE WHEN cym.RideMonth = 5 THEN cym.CompletedTrips ELSE 0 END) AS May_Trips,
            SUM(CASE WHEN cym.RideMonth = 5 THEN cym.TotalEarnings ELSE 0 END) AS May_Earnings,
            
            SUM(CASE WHEN cym.RideMonth = 6 THEN cym.CompletedTrips ELSE 0 END) AS Jun_Trips,
            SUM(CASE WHEN cym.RideMonth = 6 THEN cym.TotalEarnings ELSE 0 END) AS Jun_Earnings,
            
            SUM(CASE WHEN cym.RideMonth = 7 THEN cym.CompletedTrips ELSE 0 END) AS Jul_Trips,
            SUM(CASE WHEN cym.RideMonth = 7 THEN cym.TotalEarnings ELSE 0 END) AS Jul_Earnings,
            
            SUM(CASE WHEN cym.RideMonth = 8 THEN cym.CompletedTrips ELSE 0 END) AS Aug_Trips,
            SUM(CASE WHEN cym.RideMonth = 8 THEN cym.TotalEarnings ELSE 0 END) AS Aug_Earnings,
            
            SUM(CASE WHEN cym.RideMonth = 9 THEN cym.CompletedTrips ELSE 0 END) AS Sep_Trips,
            SUM(CASE WHEN cym.RideMonth = 9 THEN cym.TotalEarnings ELSE 0 END) AS Sep_Earnings,
            
            SUM(CASE WHEN cym.RideMonth = 10 THEN cym.CompletedTrips ELSE 0 END) AS Oct_Trips,
            SUM(CASE WHEN cym.RideMonth = 10 THEN cym.TotalEarnings ELSE 0 END) AS Oct_Earnings,
            
            SUM(CASE WHEN cym.RideMonth = 11 THEN cym.CompletedTrips ELSE 0 END) AS Nov_Trips,
            SUM(CASE WHEN cym.RideMonth = 11 THEN cym.TotalEarnings ELSE 0 END) AS Nov_Earnings,
            
            SUM(CASE WHEN cym.RideMonth = 12 THEN cym.CompletedTrips ELSE 0 END) AS Dec_Trips,
            SUM(CASE WHEN cym.RideMonth = 12 THEN cym.TotalEarnings ELSE 0 END) AS Dec_Earnings,
            
            -- Current Year Total
            SUM(cym.CompletedTrips) AS CurrentYear_TotalTrips,
            SUM(cym.TotalEarnings) AS CurrentYear_TotalEarnings,
            
            -- Last 3 Years Data (Pivoted by Year)
            SUM(CASE WHEN lys.RideYear = @CurrentYear - 3 THEN lys.CompletedTrips ELSE 0 END) AS Year3Ago_Trips,
            SUM(CASE WHEN lys.RideYear = @CurrentYear - 3 THEN lys.TotalEarnings ELSE 0 END) AS Year3Ago_Earnings,
            
            SUM(CASE WHEN lys.RideYear = @CurrentYear - 2 THEN lys.CompletedTrips ELSE 0 END) AS Year2Ago_Trips,
            SUM(CASE WHEN lys.RideYear = @CurrentYear - 2 THEN lys.TotalEarnings ELSE 0 END) AS Year2Ago_Earnings,
            
            SUM(CASE WHEN lys.RideYear = @CurrentYear - 1 THEN lys.CompletedTrips ELSE 0 END) AS Year1Ago_Trips,
            SUM(CASE WHEN lys.RideYear = @CurrentYear - 1 THEN lys.TotalEarnings ELSE 0 END) AS Year1Ago_Earnings,
            
            -- Last 3 Years Total
            SUM(lys.CompletedTrips) AS Last3Years_TotalTrips,
            SUM(lys.TotalEarnings) AS Last3Years_TotalEarnings
            
        FROM CurrentYearMonthly AS cym
        FULL OUTER JOIN Last3YearsSummary AS lys
            ON cym.DriverUserId = lys.DriverUserId
            AND cym.VehicleId = lys.VehicleId
        GROUP BY
            ISNULL(cym.DriverUserId, lys.DriverUserId),
            ISNULL(cym.VehicleId, lys.VehicleId),
            ISNULL(cym.VehicleTypeName, lys.VehicleTypeName)
    )
    SELECT
        @CurrentYear AS CurrentYear,
        cd.DriverUserId,
        CASE WHEN @GroupBy IN ('DRIVER', 'BOTH') THEN
            u.FirstName + ' ' + u.LastName
        ELSE NULL END AS DriverName,
        CASE WHEN @GroupBy IN ('DRIVER', 'BOTH') THEN
            u.Email
        ELSE NULL END AS DriverEmail,
        cd.VehicleId,
        cd.VehicleTypeName,
        
        -- Current Year Monthly Breakdown
        cd.Jan_Trips, CAST(cd.Jan_Earnings AS DECIMAL(10,2)) AS Jan_Earnings,
        cd.Feb_Trips, CAST(cd.Feb_Earnings AS DECIMAL(10,2)) AS Feb_Earnings,
        cd.Mar_Trips, CAST(cd.Mar_Earnings AS DECIMAL(10,2)) AS Mar_Earnings,
        cd.Apr_Trips, CAST(cd.Apr_Earnings AS DECIMAL(10,2)) AS Apr_Earnings,
        cd.May_Trips, CAST(cd.May_Earnings AS DECIMAL(10,2)) AS May_Earnings,
        cd.Jun_Trips, CAST(cd.Jun_Earnings AS DECIMAL(10,2)) AS Jun_Earnings,
        cd.Jul_Trips, CAST(cd.Jul_Earnings AS DECIMAL(10,2)) AS Jul_Earnings,
        cd.Aug_Trips, CAST(cd.Aug_Earnings AS DECIMAL(10,2)) AS Aug_Earnings,
        cd.Sep_Trips, CAST(cd.Sep_Earnings AS DECIMAL(10,2)) AS Sep_Earnings,
        cd.Oct_Trips, CAST(cd.Oct_Earnings AS DECIMAL(10,2)) AS Oct_Earnings,
        cd.Nov_Trips, CAST(cd.Nov_Earnings AS DECIMAL(10,2)) AS Nov_Earnings,
        cd.Dec_Trips, CAST(cd.Dec_Earnings AS DECIMAL(10,2)) AS Dec_Earnings,
        
        -- Current Year Total
        cd.CurrentYear_TotalTrips,
        CAST(cd.CurrentYear_TotalEarnings AS DECIMAL(12,2)) AS CurrentYear_TotalEarnings,
        
        -- Last 3 Years Breakdown
        (@CurrentYear - 3) AS Year3Ago,
        cd.Year3Ago_Trips,
        CAST(cd.Year3Ago_Earnings AS DECIMAL(12,2)) AS Year3Ago_Earnings,
        
        (@CurrentYear - 2) AS Year2Ago,
        cd.Year2Ago_Trips,
        CAST(cd.Year2Ago_Earnings AS DECIMAL(12,2)) AS Year2Ago_Earnings,
        
        (@CurrentYear - 1) AS Year1Ago,
        cd.Year1Ago_Trips,
        CAST(cd.Year1Ago_Earnings AS DECIMAL(12,2)) AS Year1Ago_Earnings,
        
        -- Last 3 Years Total
        cd.Last3Years_TotalTrips,
        CAST(cd.Last3Years_TotalEarnings AS DECIMAL(12,2)) AS Last3Years_TotalEarnings,
        
        -- Grand Total (Current Year + Last 3 Years)
        (cd.CurrentYear_TotalTrips + cd.Last3Years_TotalTrips) AS GrandTotal_Trips,
        CAST((cd.CurrentYear_TotalEarnings + cd.Last3Years_TotalEarnings) AS DECIMAL(12,2)) AS GrandTotal_Earnings,
        
        -- Average Earnings Per Trip
        CAST(
            (cd.CurrentYear_TotalEarnings + cd.Last3Years_TotalEarnings) / 
            NULLIF((cd.CurrentYear_TotalTrips + cd.Last3Years_TotalTrips), 0)
        AS DECIMAL(10,2)) AS AvgEarningsPerTrip
        
    FROM CombinedData AS cd
    LEFT JOIN dbo.[User] AS u ON cd.DriverUserId = u.UserId
    WHERE
        -- Apply filters
        (@MinTrips IS NULL OR (cd.CurrentYear_TotalTrips + cd.Last3Years_TotalTrips) >= @MinTrips)
        AND (@MinEarnings IS NULL OR (cd.CurrentYear_TotalEarnings + cd.Last3Years_TotalEarnings) >= @MinEarnings)
    ORDER BY
        GrandTotal_Earnings DESC,
        GrandTotal_Trips DESC;
END;
GO