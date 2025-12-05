CREATE OR ALTER PROCEDURE dbo.usp_Report_TripCount
(
    @FromDate          DATE         = NULL,
    @ToDate            DATE         = NULL,
    @Frequency         NVARCHAR(10) = 'month',      -- 'day','week','month','quarter','year'
    @ServiceTypeId     INT          = NULL,
    @RideStatus        NVARCHAR(50) = 'Completed',  -- default
    @PaymentStatus     NVARCHAR(50) = 'Completed'     -- or NULL for any
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @FromDate IS NOT NULL AND @ToDate IS NOT NULL AND @FromDate > @ToDate
    BEGIN
        ;THROW 52001, 'FromDate must be <= ToDate.', 1;
    END;

    ;WITH FilteredRides AS
    (
        SELECT
            rf.RideId,
            rf.ServiceTypeId,
            rf.ServiceTypeName,
            rf.EndedAt,
            rf.RideStatus,
            rf.PaymentStatus
        FROM dbo.vw_RideFact AS rf
        WHERE
            -- time filter: use EndedAt as completion time
            (@FromDate IS NULL OR CAST(rf.EndedAt AS DATE) >= @FromDate)
            AND (@ToDate IS NULL OR CAST(rf.EndedAt AS DATE) <= @ToDate)

            -- ride status filter (if NULL, don’t filter)
            AND (@RideStatus IS NULL OR rf.RideStatus = @RideStatus)

            -- payment status filter (if NULL, don’t filter)
            AND (@PaymentStatus IS NULL OR rf.PaymentStatus = @PaymentStatus)

            -- service type filter
            AND (@ServiceTypeId IS NULL OR rf.ServiceTypeId = @ServiceTypeId)
    )
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
        @Frequency AS PeriodGranularity,
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
    ORDER BY PeriodStart DESC, fr.ServiceTypeName;
END;
GO
