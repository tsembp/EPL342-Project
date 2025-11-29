CREATE OR ALTER PROCEDURE dbo.usp_Driver_GetAvailability
    @DriverUserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    -- We want 1 = Monday, 7 = Sunday
    SET DATEFIRST 1;

    ----------------------------------------------------------------
    -- 1. Get one approved enrollment for this driver
    ----------------------------------------------------------------
    DECLARE @EnrollId INT;

    SELECT TOP (1) @EnrollId = E.EnrollId
    FROM dbo.UserServiceEnrollment AS E
    WHERE E.UserId = @DriverUserId
      AND E.Status = 'Approved'
    ORDER BY E.EnrollId;

    -- No enrollment → return empty set (frontend will use defaults)
    IF @EnrollId IS NULL
    BEGIN
        SELECT 
            CAST(NULL AS TINYINT)  AS DayOfWeek,
            CAST(NULL AS BIT)      AS IsAvailable,
            CAST(NULL AS TIME(0))  AS StartTime,
            CAST(NULL AS TIME(0))  AS EndTime
        WHERE 1 = 0;
        RETURN;
    END;

    ----------------------------------------------------------------
    -- 2. Aggregate recurring availability per weekday
    --    We use IsRecurring = 1 as the "weekly pattern".
    ----------------------------------------------------------------
    ;WITH Raw AS (
        SELECT
            DayOfWeek  = DATEPART(WEEKDAY, DA.AvailabilityDate), -- 1..7 with DATEFIRST 1
            DA.IsRecurring,
            DA.StartsAt,
            DA.EndsAt
        FROM dbo.DriverAvailability AS DA
        WHERE DA.EnrollId = @EnrollId
    ),
    Agg AS (
        SELECT
            DayOfWeek,
            IsAvailable = CAST(1 AS BIT),
            StartTime   = MIN(StartsAt),
            EndTime     = MAX(EndsAt)
        FROM Raw
        WHERE IsRecurring = 1
        GROUP BY DayOfWeek
    )
    SELECT
        DayOfWeek,
        IsAvailable,
        StartTime,
        EndTime
    FROM Agg
    ORDER BY DayOfWeek;
END;
GO
