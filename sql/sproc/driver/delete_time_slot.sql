CREATE OR ALTER PROCEDURE dbo.usp_Driver_DeleteTimeSlot
(
    @DriverUserId     UNIQUEIDENTIFIER,
    @Date             DATE,
    @EnrollId         INT,
    @StartsAt         TIME(0)
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
    -- 1. Verify enrollment belongs to driver
    ----------------------------------------------------------------
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.UserServiceEnrollment AS SE
        WHERE SE.EnrollId = @EnrollId
          AND SE.UserId   = @DriverUserId
    )
    BEGIN
        ;THROW 50024, 'Invalid EnrollId for this driver.', 1;
    END;

    ----------------------------------------------------------------
    -- 2. Delete the specific time slot
    ----------------------------------------------------------------
    DELETE FROM dbo.DriverAvailability
    WHERE EnrollId        = @EnrollId
      AND AvailabilityDate = @Date
      AND StartsAt        = @StartsAt;

    IF @@ROWCOUNT = 0
    BEGIN
        ;THROW 50028, 'Time slot not found.', 1;
    END;
END;
GO
