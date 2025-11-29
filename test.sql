SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @DriverUserId UNIQUEIDENTIFIER = '903af692-5b33-46c9-a594-df4f0e3c87b7';

-------------------------------------------------------------------------------
-- 1. Ensure driver exists in Driver table
-------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.[User] WHERE UserId = @DriverUserId AND Role = 'D')
BEGIN
    RAISERROR('Driver not found or not a driver.', 16, 1);
    ROLLBACK TRANSACTION;
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Driver WHERE UserId = @DriverUserId)
    INSERT INTO dbo.Driver (UserId) VALUES (@DriverUserId);

-------------------------------------------------------------------------------
-- 2. Passenger
-------------------------------------------------------------------------------
DECLARE @PassengerUserId UNIQUEIDENTIFIER = NEWID();

INSERT INTO dbo.[User] (
    UserId, FirstName, LastName, Role, Dob, Gender,
    Email, Phone, Address, Username, PasswordHash, CreatedAt, Verified
)
VALUES (
    @PassengerUserId, N'TestPassenger1', N'User1', 'P', '2000-01-01', 'M',
    N'test.passenger1@example.com', N'+35799999998', N'Test Address 1',
    N'test_passenger1', N'TEST_HASH', SYSUTCDATETIME(), 1
);

INSERT INTO dbo.Passenger (UserId) VALUES (@PassengerUserId);

-------------------------------------------------------------------------------
-- 3. Geofence zone + points
-------------------------------------------------------------------------------
DECLARE @ZoneId INT, @FromPointId INT, @ToPointId INT;

INSERT INTO dbo.Geofencezone (MinLat, MinLng, MaxLat, MaxLng, Name)
VALUES (34.700000, 32.990000, 34.750000, 33.050000, N'Test Zone for Spyros');

SET @ZoneId = SCOPE_IDENTITY();

INSERT INTO dbo.ZonePoint (
    ZoneId, Latitude, Longitude, PointType, Name, IsPickupAllowed, IsDropoffAllowed
)
VALUES (@ZoneId, 34.720000, 33.000000, 'S', N'Station 4', 1, 1);

SET @FromPointId = SCOPE_IDENTITY();

INSERT INTO dbo.ZonePoint (
    ZoneId, Latitude, Longitude, PointType, Name, IsPickupAllowed, IsDropoffAllowed
)
VALUES (@ZoneId, 34.735000, 33.030000, 'S', N'Station 5', 1, 1);

SET @ToPointId = SCOPE_IDENTITY();

-------------------------------------------------------------------------------
-- 4. ServiceType, RideType, VehicleType (SAFE)
-------------------------------------------------------------------------------
DECLARE @ServiceTypeId INT, @RideTypeId INT, @VehicleTypeId INT, @RideProfileId UNIQUEIDENTIFIER;

-- ServiceType
SELECT @ServiceTypeId = ServiceTypeId
FROM dbo.ServiceType WHERE Name = 'Standard';

IF @ServiceTypeId IS NULL
BEGIN
    INSERT INTO dbo.ServiceType (Name, Description, BaseFare, PerKm, PerMin, ValidFrom, Active)
    VALUES ('Standard', 'Standard service', 3.00, 1.00, 0.20, SYSUTCDATETIME(), 1);
    SET @ServiceTypeId = SCOPE_IDENTITY();
END

-- RideType
SELECT @RideTypeId = RideTypeId FROM dbo.RideType WHERE Name = 'Direct';

IF @RideTypeId IS NULL
BEGIN
    INSERT INTO dbo.RideType (Name, Description, CreatedAt)
    VALUES ('Direct', 'Direct ride', SYSUTCDATETIME());
    SET @RideTypeId = SCOPE_IDENTITY();
END

-- VehicleType
SELECT @VehicleTypeId = VehicleTypeId FROM dbo.VehicleType WHERE Name = 'Sedan';

IF @VehicleTypeId IS NULL
BEGIN
    INSERT INTO dbo.VehicleType (Name, NumOfSeats, MinCargoVolume, MinCargoWeight)
    VALUES ('Sedan', 4, 0, 0);
    SET @VehicleTypeId = SCOPE_IDENTITY();
END

-------------------------------------------------------------------------------
-- 5. AllowedRideProfile
-------------------------------------------------------------------------------
SELECT @RideProfileId = RideProfileId
FROM dbo.AllowedRideProfile
WHERE ProfileName = 'Standard sedan direct ride';

IF @RideProfileId IS NULL
BEGIN
    SET @RideProfileId = NEWID();
    INSERT INTO dbo.AllowedRideProfile (
        RideProfileId, ServiceTypeId, RideTypeId, VehicleTypeId, ProfileName
    )
    VALUES (@RideProfileId, @ServiceTypeId, @RideTypeId, @VehicleTypeId, 'Standard sedan direct ride');
END

-------------------------------------------------------------------------------
-- 6. Vehicle + Enrollment
-------------------------------------------------------------------------------
DECLARE @VehicleId UNIQUEIDENTIFIER = NEWID(), @EnrollId INT;

INSERT INTO dbo.Vehicle (
    VehicleId, VehicleTypeId, OwnerUserId,
    PlateNumber, Brand, Model, Color,
    Verified, Seats, CargoVolume, CargoWeight,
    Status, CreatedAt
)
VALUES (
    @VehicleId, @VehicleTypeId, @DriverUserId,
    N'TEST-SPY-002', N'Toyota', N'Corolla', N'Black',
    1, 4, 0, 0, 'Active', SYSUTCDATETIME()
);

INSERT INTO dbo.UserServiceEnrollment (
    UserId, VehicleId, ServiceType, RideType, Status, ReviewedAt
)
VALUES (@DriverUserId, @VehicleId, @ServiceTypeId, @RideTypeId, 'Approved', SYSUTCDATETIME());

SET @EnrollId = SCOPE_IDENTITY();

-------------------------------------------------------------------------------
-- 7. RideRequest -> ItineraryLeg -> DispatchOffer -> Ride
-------------------------------------------------------------------------------
DECLARE @RequestId INT, @LegId INT, @OfferId INT, @RideId INT;

DECLARE @PickupAt DATETIME2 = DATEADD(MINUTE, 15, SYSUTCDATETIME());
DECLARE @DropAt   DATETIME2 = DATEADD(MINUTE, 35, SYSUTCDATETIME());

INSERT INTO dbo.RideRequest (
    PassengerId, NumOfPeople, PickupAt,
    PickUpPoint, DropOffPoint,
    CreatedAt, Status, RideProfileId
)
VALUES (
    @PassengerUserId, 1, @PickupAt,
    @FromPointId, @ToPointId,
    SYSUTCDATETIME(), 'Accepted', @RideProfileId
);

SET @RequestId = SCOPE_IDENTITY();

INSERT INTO dbo.ItineraryLeg (
    RideRequestId, SeqNo, ZoneId,
    FromPointId, ToPointId,
    ApproxStartTime, ApproxEndTime
)
VALUES (
    @RequestId, 1, @ZoneId,
    @FromPointId, @ToPointId,
    @PickupAt, @DropAt
);

SET @LegId = SCOPE_IDENTITY();

INSERT INTO dbo.DispatchOffer (
    LegId, RecipientUserId, EnrollId, Status, SentAt
)
VALUES (
    @LegId, @DriverUserId, @EnrollId,
    'Sent', SYSUTCDATETIME()
);

SET @OfferId = SCOPE_IDENTITY();

-- Ride (appears in Upcoming)
INSERT INTO dbo.Ride (
    OfferId, DriverUserId, PassengerUserId, VehicleId,
    StartedAt, EndedAt,
    DistanceKm, DurationMinutes, PriceFinal,
    Status, Payment
)
VALUES (
    @OfferId, @DriverUserId, @PassengerUserId, @VehicleId,
    @PickupAt, @DropAt,      -- scheduled times
    10.0, 20, 15.00,
    'Scheduled',
    NULL
);

SET @RideId = SCOPE_IDENTITY();

-------------------------------------------------------------------------------
-- 8. Outputs
-------------------------------------------------------------------------------
PRINT '✔ SUCCESS — Ride created for Spyros';

SELECT @RideId AS RideId, @OfferId AS OfferId, @LegId AS LegId, @RequestId AS RequestId;

COMMIT TRANSACTION;
