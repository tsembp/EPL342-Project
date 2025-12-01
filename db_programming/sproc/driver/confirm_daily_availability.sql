CREATE OR ALTER PROCEDURE dbo.usp_Driver_ConfirmDailyAvailability
(
    @DriverUserId UNIQUEIDENTIFIER,
    @Date         DATE
)
AS
BEGIN
    SET NOCOUNT ON;

    ----------------------------------------------------------------
    -- 1. Ensure there is availability for this date
    ----------------------------------------------------------------
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.DriverAvailability AS DA
        JOIN dbo.UserServiceEnrollment AS SE
          ON DA.EnrollId = SE.EnrollId
        WHERE SE.UserId         = @DriverUserId
          AND DA.AvailabilityDate = @Date
    )
    BEGIN
        ;THROW 50027, 'No availability set for this date to confirm.', 1;
    END;

    ----------------------------------------------------------------
    -- 2. If already locked → idempotent
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
        RETURN;
    END;

    ----------------------------------------------------------------
    -- 3. Lock all rows for this date/user
    ----------------------------------------------------------------
    UPDATE DA
    SET IsLocked = 1
    FROM dbo.DriverAvailability AS DA
    JOIN dbo.UserServiceEnrollment AS SE
      ON DA.EnrollId = SE.EnrollId
    WHERE SE.UserId         = @DriverUserId
      AND DA.AvailabilityDate = @Date;
END;
GO
