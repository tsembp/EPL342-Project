CREATE OR ALTER PROCEDURE dbo.usp_Driver_StartRide
(
    @DriverUserId UNIQUEIDENTIFIER,
    @RideId       INT
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE
        @CurrentStatus  NVARCHAR(100),
        @AssignedDriver UNIQUEIDENTIFIER;

    SELECT
        @CurrentStatus  = r.Status,
        @AssignedDriver = r.DriverUserId
    FROM dbo.Ride AS r
    WHERE r.RideId = @RideId;

    IF @AssignedDriver IS NULL
    BEGIN
        RAISERROR('Ride not found.', 16, 1);
        RETURN;
    END;

    IF @AssignedDriver <> @DriverUserId
    BEGIN
        RAISERROR('Ride does not belong to this driver.', 16, 1);
        RETURN;
    END;

    IF @CurrentStatus <> 'Scheduled'
    BEGIN
        RAISERROR('Ride cannot be started because it is not in Scheduled status.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.Ride
    SET
        Status    = 'InProgress',
        StartedAt = SYSUTCDATETIME()
    WHERE RideId = @RideId;
END;
GO
