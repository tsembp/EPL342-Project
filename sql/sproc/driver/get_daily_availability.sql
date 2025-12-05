CREATE OR ALTER PROCEDURE dbo.usp_Driver_GetDailyAvailability
(
    @DriverUserId UNIQUEIDENTIFIER,
    @Date         DATE
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Return at most one daily availability block (we assume 1 per day)
    SELECT TOP (1)
        DA.EnrollId,
        DA.StartsAt,
        DA.EndsAt,
        DA.IsLocked,
        DA.GeofencezoneId
    FROM dbo.DriverAvailability AS DA
    JOIN dbo.UserServiceEnrollment AS SE
      ON DA.EnrollId = SE.EnrollId
    WHERE SE.UserId         = @DriverUserId
      AND SE.Status         = 'Approved'
      AND DA.AvailabilityDate = @Date
    ORDER BY DA.StartsAt;
END;
GO
