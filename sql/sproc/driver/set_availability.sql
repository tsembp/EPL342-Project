CREATE OR ALTER PROCEDURE dbo.usp_Driver_SetAvailability
    @DriverUserId UNIQUEIDENTIFIER,
    @DayOfWeek    TINYINT,    -- 1 = Monday ... 7 = Sunday
    @IsAvailable  BIT,
    @StartTime    TIME(0) = NULL,
    @EndTime      TIME(0) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET DATEFIRST 1;

    ----------------------------------------------------------------
    -- 1. Validate DayOfWeek
    ----------------------------------------------------------------
    IF @DayOfWeek NOT BETWEEN 1 AND 7
    BEGIN
        ;THROW 50010, 'DayOfWeek must be between 1 and 7 (1=Monday,7=Sunday).', 1;
    END;

    ----------------------------------------------------------------
    -- 2. Get one approved enrollment for this driver
    ----------------------------------------------------------------
    DECLARE @EnrollId INT;

    SELECT TOP (1) @EnrollId = E.EnrollId
    FROM dbo.UserServiceEnrollment AS E
    WHERE E.UserId = @DriverUserId
      AND E.Status = 'Approved'
    ORDER BY E.EnrollId;

    IF @EnrollId IS NULL
    BEGIN
        ;THROW 50011, 'No approved enrollment found for this driver.', 1;
    END;

    ----------------------------------------------------------------
    -- 3. Figure out a representative AvailabilityDate for this weekday
    --    (must be future, because sp_AddDriverAvailability rejects past dates)
    ----------------------------------------------------------------
    DECLARE @Today DATE          = CAST(GETUTCDATE() AS DATE);
    DECLARE @TodayDow INT        = DATEPART(WEEKDAY, @Today);  -- 1..7
    DECLARE @Offset INT          = (@DayOfWeek - @TodayDow + 7) % 7;
    DECLARE @AvailabilityDate DATE = DATEADD(DAY, @Offset, @Today);

    ----------------------------------------------------------------
    -- 4. If NOT available → wipe recurring availability for this weekday
    ----------------------------------------------------------------
    IF @IsAvailable = 0
    BEGIN
        DELETE DA
        FROM dbo.DriverAvailability AS DA
        WHERE DA.EnrollId = @EnrollId
          AND DA.IsRecurring = 1
          AND DATEPART(WEEKDAY, DA.AvailabilityDate) = @DayOfWeek;

        RETURN;
    END;

    ----------------------------------------------------------------
    -- 5. Validate times when IsAvailable = 1
    ----------------------------------------------------------------
    IF @StartTime IS NULL OR @EndTime IS NULL
    BEGIN
        ;THROW 50012, 'StartTime and EndTime are required when IsAvailable = 1.', 1;
    END;

    IF @StartTime >= @EndTime
    BEGIN
        ;THROW 50013, 'StartTime must be earlier than EndTime.', 1;
    END;

    ----------------------------------------------------------------
    -- 6. Choose a Geofence zone
    --    For now: first zone in Geofencezone (you can later make this
    --    per-driver or per-enrollment if you want).
    ----------------------------------------------------------------
    DECLARE @GeofencezoneId INT;

    SELECT TOP (1) @GeofencezoneId = G.ZoneId
    FROM dbo.Geofencezone AS G
    ORDER BY G.ZoneId;

    IF @GeofencezoneId IS NULL
    BEGIN
        ;THROW 50014, 'No Geofencezone found. Configure at least one zone.', 1;
    END;

    ----------------------------------------------------------------
    -- 7. Clear existing recurring availability for this weekday
    --    (otherwise sp_AddDriverAvailability will complain about overlaps)
    ----------------------------------------------------------------
    DELETE DA
    FROM dbo.DriverAvailability AS DA
    WHERE DA.EnrollId = @EnrollId
      AND DA.IsRecurring = 1
      AND DATEPART(WEEKDAY, DA.AvailabilityDate) = @DayOfWeek;

    ----------------------------------------------------------------
    -- 8. Call your existing sp_AddDriverAvailability as the canonical
    --    way to add availability (including recurring pattern)
    ----------------------------------------------------------------
    EXEC dbo.sp_AddDriverAvailability
        @EnrollId        = @EnrollId,
        @AvailabilityDate = @AvailabilityDate,
        @GeofencezoneId  = @GeofencezoneId,
        @StartsAt        = @StartTime,
        @EndsAt          = @EndTime,
        @IsRecurring     = 1;
END;
GO
