-- Add a new availability for driver's/comp. repr's enrollment 
CREATE OR ALTER PROCEDURE [dbo].[sp_AddDriverAvailability]
    @EnrollId INT,
    @AvailabilityDate DATE,
    @GeofencezoneId INT,
    @StartsAt TIME(0),
    @EndsAt TIME(0),
    @IsRecurring BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY

        ----------------------------------------------------------------
        -- 1. Validate enrollment exists
        ----------------------------------------------------------------
        IF NOT EXISTS (
            SELECT 1 
            FROM [dbo].[UserServiceEnrollment] 
            WHERE [EnrollId] = @EnrollId
        )
        BEGIN
            ;THROW 50000, 'Invalid EnrollId', 1;
        END;

        ----------------------------------------------------------------
        -- 2. Validate enrollment is approved
        ----------------------------------------------------------------
        IF NOT EXISTS (
            SELECT 1
            FROM [dbo].[UserServiceEnrollment]
            WHERE [EnrollId] = @EnrollId AND [Status] = 'Approved'
        )
        BEGIN
            ;THROW 50001, 'Enrollment must be approved.', 1;
        END;

        ----------------------------------------------------------------
        -- 3. Validate date and time
        ----------------------------------------------------------------
        IF @AvailabilityDate < CAST(GETUTCDATE() AS DATE)
        BEGIN
            ;THROW 50002, 'Availability date cannot be in the past.', 1;
        END;
        
        IF @StartsAt >= @EndsAt
        BEGIN
            ;THROW 50003, 'StartsAt must be earlier than EndsAt.', 1;
        END;

        ----------------------------------------------------------------
        -- 4. Get UserId for this enrollment
        ----------------------------------------------------------------
        DECLARE @UserId UNIQUEIDENTIFIER;

        SELECT @UserId = [UserId]
        FROM [dbo].[UserServiceEnrollment]
        WHERE [EnrollId] = @EnrollId;

        IF @UserId IS NULL
        BEGIN
            ;THROW 50004, 'No user found for the given EnrollId.', 1;
        END;

        ----------------------------------------------------------------
        -- 5. RULE A:
        --    User can only have ONE enrollment per day.
        --    If there is availability on that date for this user
        --    under a DIFFERENT EnrollId -> reject.
        ----------------------------------------------------------------
        IF EXISTS (
            SELECT 1
            FROM [dbo].[DriverAvailability] DA
            INNER JOIN [dbo].[UserServiceEnrollment] US
                ON DA.[EnrollId] = US.[EnrollId]
            WHERE US.[UserId] = @UserId
              AND DA.[AvailabilityDate] = @AvailabilityDate
              AND DA.[EnrollId] <> @EnrollId
        )
        BEGIN
            ;THROW 50005, 'User already has availability for this date under a different enrollment.', 1;
        END;

        ----------------------------------------------------------------
        -- 6. RULE B:
        --    For this enrollment + date, ensure NO overlapping hours.
        --    Overlap condition:
        --      new.Start < existing.End AND new.End > existing.Start
        ----------------------------------------------------------------
        IF EXISTS (
            SELECT 1
            FROM [dbo].[DriverAvailability] DA
            WHERE DA.[EnrollId] = @EnrollId
              AND DA.[AvailabilityDate] = @AvailabilityDate
              AND @StartsAt < DA.[EndsAt]
              AND @EndsAt   > DA.[StartsAt]
        )
        BEGIN
            ;THROW 50006, 'Overlapping availability exists for this enrollment on this date.', 1;
        END;

        ----------------------------------------------------------------
        -- 7. Insert main availability
        ----------------------------------------------------------------
        -- Check if this exact slot already exists
        IF EXISTS (
            SELECT 1
            FROM [dbo].[DriverAvailability]
            WHERE [EnrollId] = @EnrollId
              AND [AvailabilityDate] = @AvailabilityDate
              AND [StartsAt] = @StartsAt
        )
        BEGIN
            ;THROW 50007, 'A time slot with this start time already exists. Please use a different start time.', 1;
        END;

        INSERT INTO [dbo].[DriverAvailability] (
            [EnrollId],
            [AvailabilityDate],
            [GeofencezoneId],
            [StartsAt],
            [EndsAt],
            [IsRecurring]
        )
        VALUES (
            @EnrollId,
            @AvailabilityDate,
            @GeofencezoneId,
            @StartsAt,
            @EndsAt,
            @IsRecurring
        );

        ----------------------------------------------------------------
        -- 8. If recurring, add weekly availabilities for 1 month
        --    (same rules: same enrollment per day, no overlaps)
        ----------------------------------------------------------------
        IF @IsRecurring = 1
        BEGIN
            DECLARE @NextDate DATE = DATEADD(DAY, 7, @AvailabilityDate);
            DECLARE @EndDate  DATE = DATEADD(MONTH, 1, @AvailabilityDate);

            WHILE @NextDate <= @EndDate
            BEGIN
                -- RULE A for recurring date: same user, same day, different enrollment -> reject
                IF EXISTS (
                    SELECT 1
                    FROM [dbo].[DriverAvailability] DA
                    INNER JOIN [dbo].[UserServiceEnrollment] US
                        ON DA.[EnrollId] = US.[EnrollId]
                    WHERE US.[UserId] = @UserId
                      AND DA.[AvailabilityDate] = @NextDate
                      AND DA.[EnrollId] <> @EnrollId
                )
                BEGIN
                    ;THROW 50005, 'User already has availability for one of the recurring dates under a different enrollment.', 1;
                END;

                -- RULE B for recurring date: no overlapping times for same enrollment
                IF EXISTS (
                    SELECT 1
                    FROM [dbo].[DriverAvailability] DA
                    WHERE DA.[EnrollId] = @EnrollId
                      AND DA.[AvailabilityDate] = @NextDate
                      AND @StartsAt < DA.[EndsAt]
                      AND @EndsAt   > DA.[StartsAt]
                )
                BEGIN
                    ;THROW 50006, 'Overlapping availability exists for one of the recurring dates for this enrollment.', 1;
                END;

                INSERT INTO [dbo].[DriverAvailability] (
                    [EnrollId],
                    [AvailabilityDate],
                    [GeofencezoneId],
                    [StartsAt],
                    [EndsAt],
                    [IsRecurring]
                )
                VALUES (
                    @EnrollId,
                    @NextDate,
                    @GeofencezoneId,
                    @StartsAt,
                    @EndsAt,
                    @IsRecurring
                );

                SET @NextDate = DATEADD(DAY, 7, @NextDate); -- next week
            END;
        END;

        SELECT @@ROWCOUNT AS RowsAffected; -- from last insert
    END TRY
    BEGIN CATCH
        ;THROW;
    END CATCH;
END;
