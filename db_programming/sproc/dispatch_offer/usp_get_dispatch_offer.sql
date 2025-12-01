CREATE OR ALTER PROCEDURE dbo.usp_GetDispatchOffersForDriver
(
    @DriverUserId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @DriverUserId IS NULL
    BEGIN
        RAISERROR('DriverUserId cannot be NULL.', 16, 1);
        RETURN;
    END;

    /*
        A DispatchOffer belongs to a driver when:
        DispatchOffer.RecipientUserId = User.UserId (driver)
    */

    SELECT 
        DO.OfferId,
        DO.Status AS OfferStatus,
        DO.SentAt,
        DO.RespondedAt,

        -- Enrollment (Driver ↔ Vehicle ↔ Service/Ride type)
        DO.EnrollId,
        E.VehicleId,
        E.ServiceType AS ServiceTypeId,
        ST.Name AS ServiceTypeName,
        E.RideType AS RideTypeId,
        RT.Name AS RideTypeName,

        -- Itinerary leg
        IL.LegId,
        IL.SeqNo,
        IL.ZoneId,
        IL.FromPointId,
        IL.ToPointId,
        IL.ApproxStartTime,
        IL.ApproxEndTime,

        -- ZonePoint Names
        ZP_From.Name AS FromPointName,
        ZP_To.Name   AS ToPointName,

        ZP_From.Latitude   AS FromLat,
        ZP_From.Longitude  AS FromLng,
        ZP_To.Latitude     AS ToLat,
        ZP_To.Longitude    AS ToLng,

        RR.RequestId,
        RR.NumOfPeople,
        RR.PickupAt,
        RR.Status AS RequestStatus,
        RR.PickUpPoint,
        RR.DropOffPoint

    FROM dbo.DispatchOffer DO
    INNER JOIN dbo.[User] U
        ON U.UserId = DO.RecipientUserId
    INNER JOIN dbo.UserServiceEnrollment E
        ON E.EnrollId = DO.EnrollId
    INNER JOIN dbo.ItineraryLeg IL
        ON IL.LegId = DO.LegId
    INNER JOIN dbo.RideRequest RR
        ON RR.RequestId = IL.RideRequestId
    LEFT JOIN dbo.ZonePoint ZP_From
        ON ZP_From.PointId = IL.FromPointId
    LEFT JOIN dbo.ZonePoint ZP_To
        ON ZP_To.PointId = IL.ToPointId
    LEFT JOIN dbo.ServiceType ST
        ON ST.ServiceTypeId = E.ServiceType
    LEFT JOIN dbo.RideType RT
        ON RT.RideTypeId = E.RideType
    WHERE DO.RecipientUserId = @DriverUserId
    ORDER BY DO.SentAt DESC;
END;
GO
