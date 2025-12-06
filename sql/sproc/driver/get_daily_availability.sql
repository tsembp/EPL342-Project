CREATE OR ALTER PROCEDURE dbo.usp_Driver_GetDailyAvailability
(
    @DriverUserId UNIQUEIDENTIFIER,
    @Date         DATE
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Return all time slots for this driver on this date
    -- Multiple non-overlapping time slots allowed for same enrollment
    SELECT
        DA.EnrollId,
        DA.StartsAt,
        DA.EndsAt,
        DA.IsLocked,
        DA.GeofencezoneId,
        DA.AvailabilityDate
    FROM dbo.DriverAvailability AS DA
    JOIN dbo.UserServiceEnrollment AS SE
      ON DA.EnrollId = SE.EnrollId
    WHERE SE.UserId         = @DriverUserId
      AND SE.Status         = 'Approved'
      AND DA.AvailabilityDate = @Date
    ORDER BY DA.StartsAt;
END;
GO
