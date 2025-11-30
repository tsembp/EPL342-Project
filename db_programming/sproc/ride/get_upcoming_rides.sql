CREATE OR ALTER PROCEDURE dbo.usp_Driver_GetUpcomingRides
(
    @DriverUserId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.RideId,
        rr.RequestId,
        il.LegId,
        rr.NumOfPeople,
        r.Status,
        il.ApproxStartTime   AS ScheduledStart,
        il.ApproxEndTime     AS ScheduledEnd,
        zp_from.Name         AS FromName,
        zp_to.Name           AS ToName,
        zp_from.Latitude     AS FromLat,
        zp_from.Longitude    AS FromLng,
        zp_to.Latitude       AS ToLat,
        zp_to.Longitude      AS ToLng
    FROM dbo.Ride AS r
    INNER JOIN dbo.DispatchOffer AS dof
        ON dof.OfferId = r.OfferId
    INNER JOIN dbo.ItineraryLeg AS il
        ON il.LegId = dof.LegId
    INNER JOIN dbo.RideRequest AS rr
        ON rr.RequestId = il.RideRequestId
    INNER JOIN dbo.ZonePoint AS zp_from
        ON zp_from.PointId = il.FromPointId
    INNER JOIN dbo.ZonePoint AS zp_to
        ON zp_to.PointId = il.ToPointId
    WHERE
        r.DriverUserId = @DriverUserId
        AND r.Status IN ('Scheduled', 'InProgress')
    ORDER BY il.ApproxStartTime ASC, r.RideId ASC;
END;
GO
