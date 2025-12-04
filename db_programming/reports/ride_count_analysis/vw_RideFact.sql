IF OBJECT_ID('dbo.vw_RideFact', 'V') IS NOT NULL
    DROP VIEW dbo.vw_RideFact;
GO

CREATE VIEW dbo.vw_RideFact
AS
SELECT
    rwp.RideId,
    rwp.RideStatus,
    rwp.StartedAt,
    rwp.EndedAt,
    rwp.DistanceKm,
    rwp.DurationMinutes,
    rwp.PriceFinal,

    -- category
    rwp.ServiceTypeId,
    rwp.ServiceTypeName,
    rwp.RideTypeId,
    rwp.RideTypeName,

    -- driver / passenger / vehicle
    rwp.DriverUserId,
    rwp.PassengerUserId,
    rwp.VehicleId,
    rwp.VehicleTypeName,

    -- pickup/dropoff
    rwp.PickupPointId,
    rwp.DropoffPointId,

    -- payment
    rwp.PaymentId,
    rwp.GrossAmount,
    rwp.PlatformFee,
    rwp.DriverPayout,
    rwp.PaidAt,
    rwp.PaymentMethod,
    rwp.PaymentStatus
FROM dbo.vw_RideWithPricing AS rwp
GROUP BY
    rwp.RideId,
    rwp.RideStatus,
    rwp.StartedAt,
    rwp.EndedAt,
    rwp.DistanceKm,
    rwp.DurationMinutes,
    rwp.PriceFinal,
    rwp.ServiceTypeId,
    rwp.ServiceTypeName,
    rwp.RideTypeId,
    rwp.RideTypeName,
    rwp.DriverUserId,
    rwp.PassengerUserId,
    rwp.VehicleId,
    rwp.VehicleTypeName,
    rwp.PickupPointId,
    rwp.DropoffPointId,
    rwp.PaymentId,
    rwp.GrossAmount,
    rwp.PlatformFee,
    rwp.DriverPayout,
    rwp.PaidAt,
    rwp.PaymentMethod,
    rwp.PaymentStatus;
GO
