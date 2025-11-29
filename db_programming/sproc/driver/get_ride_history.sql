CREATE OR ALTER PROCEDURE dbo.usp_Driver_GetRideHistory
    @DriverUserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        R.RideId,
        DOF.LegId,
        RR.RequestId,
        RR.NumOfPeople,
        R.Status,
        R.StartedAt,
        R.EndedAt,
        R.PriceFinal,
        ZP_FROM.Name AS FromName,
        ZP_TO.Name   AS ToName,
        P.Method     AS PaymentMethod,
        P.Status     AS PaymentStatus,
        P.PaidAt     AS PaymentPaidAt
    FROM dbo.Ride              AS R
    JOIN dbo.DispatchOffer     AS DOF ON DOF.OfferId = R.OfferId
    JOIN dbo.RideRequest       AS RR  ON RR.RequestId = DOF.LegId   -- adjust if RequestId relation differs
    JOIN dbo.ZonePoint         AS ZP_FROM ON ZP_FROM.PointId = RR.PickUpPoint
    JOIN dbo.ZonePoint         AS ZP_TO   ON ZP_TO.PointId = RR.DropOffPoint
    LEFT JOIN dbo.Payment      AS P  ON P.PaymentId = R.Payment
    WHERE 
        R.DriverUserId = @DriverUserId
        AND R.Status IN ('Completed', 'Cancelled')
    ORDER BY 
        R.EndedAt DESC;
END;
