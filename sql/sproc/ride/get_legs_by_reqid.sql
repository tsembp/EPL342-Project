CREATE OR ALTER PROCEDURE dbo.usp_GetRideLegsByRequestId
    @RideRequestId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        R.RideId,
        IL.SeqNo            AS LegIndex,
        zp_leg_from.Name    AS FromName,
        zp_leg_to.Name      AS ToName,
        R.Status            AS RideStatus,
        U.FirstName + ' ' + U.LastName AS DriverName,
        V.PlateNumber       AS VehiclePlate,
        VT.Name             AS VehicleType,
        IL.ApproxStartTime  AS PlannedStart,
        IL.ApproxEndTime    AS PlannedEnd,
        R.PriceFinal        AS PriceFinal,
        R.Payment           AS PaymentId,
        P.Status            AS PaymentStatus
    FROM dbo.Ride R
    JOIN dbo.DispatchOffer DO
        ON DO.OfferId = R.OfferId
    JOIN dbo.ItineraryLeg IL
        ON IL.LegId = DO.LegId
    JOIN dbo.ZonePoint zp_leg_from
        ON zp_leg_from.PointId = IL.FromPointId
    JOIN dbo.ZonePoint zp_leg_to
        ON zp_leg_to.PointId   = IL.ToPointId
    LEFT JOIN dbo.[User] U
        ON U.UserId = R.DriverUserId
    LEFT JOIN dbo.Vehicle V
        ON V.VehicleId = R.VehicleId
    LEFT JOIN dbo.VehicleType VT
        ON VT.VehicleTypeId = V.VehicleTypeId
    LEFT JOIN dbo.Payment P
        ON P.PaymentId = R.Payment
    WHERE DO.Status = 'Accepted'
      AND IL.RideRequestId = @RideRequestId
    ORDER BY IL.SeqNo;
END;
