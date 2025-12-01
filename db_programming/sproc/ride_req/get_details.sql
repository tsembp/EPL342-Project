CREATE OR ALTER PROCEDURE dbo.usp_GetPassengerRideRequestDetails
    @RequestId   INT,
    @PassengerId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        RR.RequestId,
        RR.Status,
        RR.NumOfPeople,
        RR.PickupAt,
        zp_from.PointId   AS FromPointId,
        zp_from.ZoneId    AS FromZoneId,
        zp_from.Name      AS FromName,
        zp_from.Latitude  AS FromLatitude,
        zp_from.Longitude AS FromLongitude,
        zp_to.PointId     AS ToPointId,
        zp_to.ZoneId      AS ToZoneId,
        zp_to.Name        AS ToName,
        zp_to.Latitude    AS ToLatitude,
        zp_to.Longitude   AS ToLongitude,
        RR.RideProfileId  AS RideProfileId,
        st.Name           AS ServiceTypeName,
        rt.Name           AS RideTypeName,
        vt.Name           AS VehicleTypeName
    FROM dbo.RideRequest RR
    JOIN dbo.AllowedRideProfile arp ON arp.RideProfileId = RR.RideProfileId
    JOIN dbo.ServiceType st ON st.ServiceTypeId = arp.ServiceTypeId
    JOIN dbo.RideType rt ON rt.RideTypeId = arp.RideTypeId
    JOIN dbo.VehicleType vt ON vt.VehicleTypeId = arp.VehicleTypeId
    JOIN dbo.ZonePoint zp_from ON zp_from.PointId = RR.PickUpPoint
    JOIN dbo.ZonePoint zp_to   ON zp_to.PointId   = RR.DropOffPoint
    WHERE RR.RequestId = @RequestId
      AND RR.PassengerId = @PassengerId;
END;

GO

CREATE OR ALTER PROCEDURE dbo.usp_GetPassengerRideRequests
    @PassengerId   UNIQUEIDENTIFIER,
    @StatusFilter  VARCHAR(100) = NULL,
    @Page          INT,
    @PageSize      INT
AS
BEGIN
    SET NOCOUNT ON;

    WITH ReqAgg AS (
        SELECT
            rr.RequestId,
            rr.Status AS RequestStatus,
            rr.PickupAt,
            zp_from.Name AS FromName,
            zp_to.Name   AS ToName,
            -- trip-level aggregates
            CASE WHEN COUNT(r.RideId) > 0 THEN 1 ELSE 0 END AS HasRides,
            COUNT(DISTINCT r.RideId)          AS RideCount,
            MIN(r.StartedAt)                  AS FirstRideStart,
            MAX(r.EndedAt)                    AS LastRideEnd,
            SUM(ISNULL(r.PriceFinal, 0))      AS TotalPrice,
            -- a simple "latest" ride status (for list display)
            MAX(r.Status)                     AS LatestRideStatus
        FROM dbo.RideRequest rr
        LEFT JOIN dbo.ItineraryLeg il
            ON rr.RequestId = il.RideRequestId
        LEFT JOIN dbo.DispatchOffer dof
            ON dof.LegId = il.LegId
        LEFT JOIN dbo.Ride r
            ON r.OfferId = dof.OfferId
        LEFT JOIN dbo.ZonePoint zp_from
            ON rr.PickUpPoint = zp_from.PointId
        LEFT JOIN dbo.ZonePoint zp_to
            ON rr.DropOffPoint = zp_to.PointId
        WHERE rr.PassengerId = @PassengerId
          AND (
                @StatusFilter IS NULL
                OR @StatusFilter = ''
                OR rr.Status = @StatusFilter
              )
        GROUP BY
            rr.RequestId,
            rr.Status,
            rr.PickupAt,
            zp_from.Name,
            zp_to.Name
    )
    SELECT
        RequestId,
        RequestStatus,
        PickupAt,
        FromName,
        ToName,
        HasRides,
        RideCount,
        FirstRideStart,
        LastRideEnd,
        TotalPrice,
        LatestRideStatus,
        COUNT(*) OVER() AS TotalCount
    FROM ReqAgg
    ORDER BY PickupAt DESC
    OFFSET (@Page - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;
GO