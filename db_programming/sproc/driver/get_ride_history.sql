CREATE OR ALTER PROCEDURE dbo.usp_Driver_GetRideHistory
    @DriverUserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- No need to check role - just filter by DriverUserId
    SELECT 
        R.RideId,
        IL.LegId,
        RR.RequestId,
        RR.NumOfPeople,
        R.Status,
        R.StartedAt,
        R.EndedAt,
        R.PriceFinal,

        -- route
        ZP_FROM.Name AS FromName,
        ZP_TO.Name   AS ToName,

        -- payment method & status
        P.Method       AS PaymentMethod,
        P.Status       AS PaymentStatus,
        P.PaidAt       AS PaymentPaidAt,

        -- NEW: financial breakdown
        P.GrossAmount  AS PaymentGrossAmount,   -- passenger total
        P.OsrhFee      AS PaymentOsrhFee,       -- OSRH fee
        P.DriverPayout AS PaymentDriverPayout   -- driver's income

    FROM dbo.Ride R
    INNER JOIN dbo.DispatchOffer DOF
        ON DOF.OfferId = R.OfferId

    INNER JOIN dbo.ItineraryLeg IL
        ON IL.LegId = DOF.LegId

    INNER JOIN dbo.RideRequest RR
        ON RR.RequestId = IL.RideRequestId

    LEFT JOIN dbo.ZonePoint ZP_FROM
        ON ZP_FROM.PointId = IL.FromPointId

    LEFT JOIN dbo.ZonePoint ZP_TO
        ON ZP_TO.PointId = IL.ToPointId

    LEFT JOIN dbo.Payment P
        ON P.PaymentId = R.Payment

    WHERE 
        R.DriverUserId = @DriverUserId
        AND R.Status IN ('Completed', 'Cancelled')

    ORDER BY R.EndedAt DESC;
END;
GO
