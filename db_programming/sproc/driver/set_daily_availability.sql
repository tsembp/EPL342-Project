CREATE OR ALTER PROCEDURE dbo.usp_Driver_SetDailyAvailability
(
    @DriverUserId UNIQUEIDENTIFIER,
    @Date         DATE,
    @Enabled      BIT,
    @EnrollId     INT       = NULL,
    @StartsAt     TIME(0)   = NULL,
    @EndsAt       TIME(0)   = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    ----------------------------------------------------------------
    -- 0. Block if already locked for this user & date
    ----------------------------------------------------------------
    IF EXISTS (
        SELECT 1
        FROM dbo.DriverAvailability AS DA
        JOIN dbo.UserServiceEnrollment AS SE
          ON DA.EnrollId = SE.EnrollId
        WHERE SE.UserId         = @DriverUserId
          AND DA.AvailabilityDate = @Date
          AND DA.IsLocked = 1
    )
    BEGIN
        ;THROW 50020, 'Today''s availability has been confirmed and can no longer be changed.', 1;
    END;

    ----------------------------------------------------------------
    -- 1. If disabling -> delete all availability for that user/date
    ----------------------------------------------------------------
    IF (@Enabled = 0)
    BEGIN
        DELETE DA
        FROM dbo.DriverAvailability AS DA
        JOIN dbo.UserServiceEnrollment AS SE
          ON DA.EnrollId = SE.EnrollId
        WHERE SE.UserId         = @DriverUserId
          AND DA.AvailabilityDate = @Date;

        RETURN;
    END;

    ----------------------------------------------------------------
    -- 2. Enabling -> validate inputs
    ----------------------------------------------------------------
    IF @EnrollId IS NULL
    BEGIN
        ;THROW 50021, 'EnrollId is required when Enabled = 1.', 1;
    END;

    IF @StartsAt IS NULL OR @EndsAt IS NULL
    BEGIN
        ;THROW 50022, 'StartsAt and EndsAt are required when Enabled = 1.', 1;
    END;

    IF @EndsAt <= @StartsAt
    BEGIN
        ;THROW 50023, 'EndsAt must be later than StartsAt.', 1;
    END;

    ----------------------------------------------------------------
    -- 3. Check enrollment belongs to driver and is Approved
    ----------------------------------------------------------------
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.UserServiceEnrollment AS SE
        WHERE SE.EnrollId = @EnrollId
          AND SE.UserId   = @DriverUserId
          AND SE.Status   = 'Approved'
    )
    BEGIN
        ;THROW 50024, 'Invalid EnrollId or enrollment not approved for this driver.', 1;
    END;

    ----------------------------------------------------------------
    -- 4. Enforce 1 service per day for this driver
    ----------------------------------------------------------------
    IF EXISTS (
        SELECT 1
        FROM dbo.DriverAvailability AS DA
        JOIN dbo.UserServiceEnrollment AS SE
          ON DA.EnrollId = SE.EnrollId
        WHERE SE.UserId         = @DriverUserId
          AND DA.AvailabilityDate = @Date
          AND DA.EnrollId <> @EnrollId
    )
    BEGIN
        ;THROW 50025, 'You already have availability for this date with another service. Disable it first.', 1;
    END;

    ----------------------------------------------------------------
    -- 5. Delete existing availability for this enrollId/date
    ----------------------------------------------------------------
    DELETE FROM dbo.DriverAvailability
    WHERE EnrollId        = @EnrollId
      AND AvailabilityDate = @Date;

    ----------------------------------------------------------------
    -- 6. Choose a Geofence zone (simple rule: first one)
    ----------------------------------------------------------------
    DECLARE @GeofencezoneId INT;

    SELECT TOP (1) @GeofencezoneId = G.ZoneId
    FROM dbo.Geofencezone AS G
    ORDER BY G.ZoneId;

    IF @GeofencezoneId IS NULL
    BEGIN
        ;THROW 50026, 'No Geofencezone found. Configure at least one zone.', 1;
    END;

    ----------------------------------------------------------------
    -- 7. Insert new availability (non-recurring) via canonical proc
    ----------------------------------------------------------------
    EXEC dbo.sp_AddDriverAvailability
        @EnrollId         = @EnrollId,
        @AvailabilityDate = @Date,
        @GeofencezoneId   = @GeofencezoneId,
        @StartsAt         = @StartsAt,
        @EndsAt           = @EndsAt,
        @IsRecurring      = 0;
END;
GO
